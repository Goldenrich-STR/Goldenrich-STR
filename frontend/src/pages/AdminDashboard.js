import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient, { verificationAPI, subscriptionAPI, uploadAPI, getImageUrl, bookingAPI, cmsAPI, adminAPI } from '../services/api';
import { 
  Users, Building2, Calendar, IndianRupee, CheckCircle, 
  X, XCircle, Clock, TrendingUp, BarChart3, LogOut, Plus, Trash, Zap,
  Edit, Eye as EyeIcon, Shield, ChevronLeft, ChevronRight, Tag,
  Check, ListTodo, Heart, FileText, Sparkles, UploadCloud
} from 'lucide-react';
import CouponManagement from '../components/admin/CouponManagement';
import SearchLogsManagement from '../components/admin/SearchLogsManagement';
import AICallsManagement from '../components/admin/AICallsManagement';
import { Phone, Volume2 } from 'lucide-react';

const PremiumDatePicker = ({ value, onChange, placeholder = 'Select Date', required = false }) => {
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
    <div className="relative" ref={containerRef}>
      <div 
        className="w-full border-2 border-sand-200 rounded-xl px-4 py-3 focus-within:border-terracotta outline-none transition font-semibold text-charcoal bg-white flex justify-between items-center cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? "text-charcoal" : "text-sand-300 font-normal"}>
          {formatDisplay(value) || placeholder}
        </span>
        <Calendar className="w-4 h-4 text-charcoal-muted" />
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-premium border border-sand-200 p-4 w-72 z-[150] animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <button 
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-sand-100 rounded-lg transition text-charcoal font-black text-sm"
            >
              &larr;
            </button>
            <div className="flex space-x-1">
              <select 
                value={currentMonth}
                onChange={e => setCurrentMonth(parseInt(e.target.value))}
                className="bg-transparent text-sm font-black text-charcoal uppercase tracking-wider outline-none cursor-pointer hover:text-terracotta transition"
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx} className="text-charcoal bg-white normal-case font-bold">{m}</option>
                ))}
              </select>
              <select 
                value={currentYear}
                onChange={e => setCurrentYear(parseInt(e.target.value))}
                className="bg-transparent text-sm font-black text-charcoal tracking-wide outline-none cursor-pointer hover:text-terracotta transition"
              >
                {years.map(y => (
                  <option key={y} value={y} className="text-charcoal bg-white font-bold">{y}</option>
                ))}
              </select>
            </div>
            <button 
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-sand-100 rounded-lg transition text-charcoal font-black text-sm"
            >
              &rarr;
            </button>
          </div>

          <div className="grid grid-cols-7 text-center mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest">{day}</div>
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
                  className={`h-8 w-8 text-xs font-black rounded-lg transition-all flex items-center justify-center ${
                    active
                      ? 'bg-terracotta text-white shadow-elevated scale-105'
                      : 'hover:bg-sand-100 text-charcoal'
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
              className="text-[10px] font-black text-charcoal-muted hover:text-charcoal uppercase tracking-widest transition"
            >
              Clear
            </button>
            <button 
              type="button"
              onClick={handleToday}
              className="text-[10px] font-black text-terracotta hover:text-terracotta-dark uppercase tracking-widest transition"
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
        required={required} 
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
    <div className="min-h-screen bg-sand-50">
      {/* Header */}
      <header className="header-glass px-6 py-4" data-testid="admin-header">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="brand-logo-full w-10 h-10 object-contain transition-transform duration-300 group-hover:scale-110"
            />
          </div>
          <div className="flex items-center space-x-6">
            <span className="text-charcoal-light">Admin: {user?.full_name}</span>
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-4xl font-extrabold text-charcoal" data-testid="dashboard-title">
            Dashboard Overview
          </h2>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 mb-8 border-b border-stone" data-testid="admin-tabs">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'properties', label: 'Properties', icon: Building2 },
            { id: 'bookings', label: 'Bookings', icon: Calendar },
            { id: 'subscriptions', label: 'Subscriptions', icon: Zap },
            { id: 'cms', label: 'CMS', icon: TrendingUp },
            { id: 'coupons', label: 'Coupons', icon: Tag },
            { id: 'search-logs', label: 'Search Logs', icon: FileText },
            { id: 'ai-calls', label: 'AI Voice Calls', icon: Phone },
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
                      className="flex items-center space-x-3 p-4 bg-sand-50 rounded-lg hover:bg-sand-100 transition"
                      data-testid="action-manage-users"
                    >
                      <Users className="w-6 h-6 text-terracotta" />
                      <span className="font-semibold text-charcoal">Manage Users</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('properties')}
                      className="flex items-center space-x-3 p-4 bg-sand-50 rounded-lg hover:bg-sand-100 transition"
                      data-testid="action-review-properties"
                    >
                      <Building2 className="w-6 h-6 text-sage" />
                      <span className="font-semibold text-charcoal">Review Properties</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('cms')}
                      className="flex items-center space-x-3 p-4 bg-sand-50 rounded-lg hover:bg-sand-100 transition"
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

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <BookingManagement />
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <SubscriptionManagement />
        )}

        {/* CMS Tab */}
        {activeTab === 'cms' && (
          <CMSManagement />
        )}

        {/* Coupons Tab */}
        {activeTab === 'coupons' && (
          <div data-testid="coupons-section" className="animate-fade-in">
            <CouponManagement />
          </div>
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
      </div>
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

// User Management Component
const UserManagement = ({ roleFilter, setRoleFilter }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
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
    profile_image: ''
  });
  const [uploading, setUploading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [allBrokers, setAllBrokers] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [rejectDocState, setRejectDocState] = useState(null);

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
      password: ''
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
  }, [roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, currentPage]);

  useEffect(() => {
    const generateUID = () => {
      const { role, city, state, branch, franchise, birthdate } = newUser;
      
      const cleanState = (state || '').trim().substring(0, 2).toUpperCase();
      const cleanCity = (city || '').trim().substring(0, 3).toUpperCase();
      const cleanBranch = (branch || '').trim().substring(0, 3).toUpperCase();
      const cleanFranchise = (franchise || '').trim().substring(0, 3).toUpperCase();
      
      // Get series based on current role count
      const roleUsers = users.filter(u => u.role === role);
      const series = String(roleUsers.length + 1).padStart(3, '0');
      
      // Get birthdate month
      let birthMonth = '00';
      if (birthdate) {
        const dateObj = new Date(birthdate);
        if (!isNaN(dateObj.getTime())) {
          birthMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
        }
      }
      
      // Get registration date day
      const regDay = String(new Date().getDate()).padStart(2, '0');
      
      let generated = '';
      if (role === 'broker') {
        generated = `${cleanState}${cleanCity}${cleanBranch}${cleanFranchise}BR${series}${birthMonth}${regDay}`;
      } else if (role === 'employee') {
        generated = `${cleanState}${cleanCity}${cleanBranch}${cleanFranchise}EMP${series}${birthMonth}${regDay}`;
      } else if (role === 'admin') {
        generated = `ADMIN${series}`;
      } else if (role === 'host') {
        generated = `HST${cleanState || 'XX'}${cleanCity || 'XXX'}${series}`;
      } else { // guest
        generated = `GST${cleanState || 'XX'}${cleanCity || 'XXX'}${series}`;
      }
      
      // Enforce 30 chars limit
      generated = generated.substring(0, 30);
      
      setNewUser(prev => {
        if (prev.uid !== generated) {
          return { ...prev, uid: generated };
        }
        return prev;
      });
    };
    
    generateUID();
  }, [newUser.role, newUser.city, newUser.state, newUser.branch, newUser.franchise, newUser.birthdate, users]);

  const fetchUsers = async () => {
    try {
      const params = {
        limit: usersPerPage,
        skip: (currentPage - 1) * usersPerPage,
        ...(roleFilter ? { role: roleFilter } : {})
      };
      const response = await apiClient.get('/admin/users', { params });
      setUsers(response.data.users || []);
      setTotalUsers(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
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
        profile_image: ''
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
      setViewUser(prev => ({ ...prev, broker_id: brokerId }));
      fetchUsers();
    } catch (error) {
      alert('Failed to assign broker: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleAssignRM = async (userId, rmId) => {
    try {
      await apiClient.patch(`/admin/users/${userId}`, { rm_id: rmId });
      alert('RM assigned successfully!');
      setViewUser(prev => ({ ...prev, rm_id: rmId }));
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

  return (
    <div data-testid="user-management">
      <div className="dashboard-card mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-charcoal">User Management</h3>
          <div className="flex items-center space-x-4">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-field w-48"
              data-testid="role-filter"
            >
              <option value="">All Roles</option>
              <option value="guest">Guests</option>
              <option value="host">Hosts</option>
              <option value="broker">Brokers</option>
              <option value="employee">Employees</option>
              <option value="admin">Admins</option>
            </select>
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

      {loading ? (
        <div className="text-center py-12">
          <p className="text-charcoal-light">Loading users...</p>
        </div>
      ) : (
        <div className="space-y-4" data-testid="users-list">
          {users.map((user) => (
            <div key={user.user_id} className="dashboard-card hover:shadow-md transition-all group" data-testid={`user-${user.user_id}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {user.profile_image ? (
                      <img
                        src={getImageUrl(user.profile_image)}
                        alt={user.full_name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-sand-200"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-terracotta/10 border-2 border-sand-200 flex items-center justify-center font-black text-terracotta text-lg uppercase">
                        {user.full_name ? user.full_name.charAt(0) : '?'}
                      </div>
                    )}
                    <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  </div>
                  <div>
                    <h4 className="font-bold text-charcoal text-lg">{user.full_name}</h4>
                    <p className="text-sm text-charcoal-light">{user.email} | {user.phone}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="inline-block px-2 py-0.5 bg-terracotta/10 text-terracotta text-[10px] font-black uppercase tracking-wider rounded">
                        {user.role}
                      </span>
                      {user.role === 'host' && (
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded border ${
                          user.kyc_status === 'approved' ? 'bg-green-50 text-green-600 border-green-200' :
                          user.kyc_status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                          user.kyc_status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse' :
                          'bg-sand-100 text-charcoal-light border-sand-200'
                        }`}>
                          KYC: {user.kyc_status || 'unverified'}
                        </span>
                      )}
                      {user.user_id && (
                        <span className="inline-block px-2 py-0.5 bg-sage/10 text-sage-dark text-[10px] font-mono tracking-wider rounded">
                          UID: {user.user_id}
                        </span>
                      )}
                      {user.city && (
                        <span className="text-xs text-charcoal-muted">in {user.city}</span>
                      )}
                      {user.created_at && (
                        <span className="inline-block px-2 py-0.5 bg-sand-100 text-charcoal-muted text-[10px] font-medium rounded flex items-center">
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
          {totalUsers > usersPerPage && (
            <div className="flex justify-between items-center bg-white px-6 py-4 rounded-[2rem] border border-sand-200 mt-6 flex-wrap gap-4">
              <p className="text-xs text-charcoal-muted">
                Showing <span className="font-bold text-charcoal">{(currentPage - 1) * usersPerPage + 1}</span> to{' '}
                <span className="font-bold text-charcoal">
                  {Math.min(currentPage * usersPerPage, totalUsers)}
                </span>{' '}
                of <span className="font-bold text-charcoal">{totalUsers}</span> users
              </p>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl border border-sand-200 text-charcoal-light hover:bg-sand-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.ceil(totalUsers / usersPerPage) }).map((_, idx) => {
                  const pageNum = idx + 1;
                  const totalPages = Math.ceil(totalUsers / usersPerPage);
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
                        className={`w-8 h-8 rounded-xl text-xs font-black transition-colors ${
                          currentPage === pageNum
                            ? 'bg-terracotta text-white font-bold'
                            : 'border border-sand-200 text-charcoal hover:bg-sand-50'
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
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalUsers / usersPerPage)))}
                  disabled={currentPage === Math.ceil(totalUsers / usersPerPage)}
                  className="p-2 rounded-xl border border-sand-200 text-charcoal-light hover:bg-sand-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-premium animate-slide-up overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-sand-200">
              <div>
                <h3 className="text-2xl font-black text-charcoal leading-none mb-1">Create New User</h3>
                <span className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest">Register professional nodes in the STR network</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-terracotta/10 flex items-center justify-center text-terracotta">
                <Shield className="w-5 h-5" />
              </div>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-6">
              {/* Profile Image Upload Component */}
              <div className="bg-sand-50/50 border border-sand-200/80 rounded-2xl p-5 mb-4 transition-all duration-300 animate-slide-up">
                <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-3">Profile Image</label>
                {newUser.profile_image ? (
                  <div className="flex items-center space-x-4">
                    <div className="relative group">
                      <img 
                        src={getImageUrl(newUser.profile_image)} 
                        alt="Preview" 
                        className="w-16 h-16 rounded-full object-cover border-2 border-terracotta/80 shadow-md group-hover:opacity-90 transition-opacity"
                      />
                      <button 
                        type="button"
                        onClick={() => setNewUser(prev => ({ ...prev, profile_image: '' }))}
                        className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center shadow transition-transform hover:scale-110 active:scale-95"
                        title="Remove Image"
                      >
                        <span className="font-bold text-xs">×</span>
                      </button>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-sage-dark uppercase tracking-widest block mb-0.5">Uploaded</span>
                      <span className="text-xs font-bold text-charcoal-light block">Image successfully registered</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="w-full text-xs text-charcoal-light file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-wider file:bg-terracotta/10 file:text-terracotta hover:file:bg-terracotta/20 cursor-pointer disabled:opacity-50"
                    />
                    {uploading ? (
                      <span className="text-[10px] font-black text-terracotta uppercase tracking-widest animate-pulse">Uploading to node server...</span>
                    ) : (
                      <span className="text-[9px] font-medium text-charcoal-muted">Supported formats: PNG, JPG, JPEG, WEBP, GIF (Max 8MB)</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5">Full Name</label>
                <input 
                  required
                  placeholder="John Doe"
                  className="w-full border-2 border-sand-200 rounded-xl px-4 py-3 focus:border-terracotta outline-none transition font-semibold text-charcoal placeholder:font-normal placeholder:text-sand-300"
                  value={newUser.full_name}
                  onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5">Email Address</label>
                  <input 
                    type="email" required
                    placeholder="john@example.com"
                    className="w-full border-2 border-sand-200 rounded-xl px-4 py-3 focus:border-terracotta outline-none transition font-semibold text-charcoal placeholder:font-normal placeholder:text-sand-300"
                    value={newUser.email}
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5">Phone Number</label>
                  <input 
                    required
                    placeholder="+91..."
                    className="w-full border-2 border-sand-200 rounded-xl px-4 py-3 focus:border-terracotta outline-none transition font-semibold text-charcoal placeholder:font-normal placeholder:text-sand-300"
                    value={newUser.phone}
                    onChange={e => setNewUser({...newUser, phone: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5">Password</label>
                <input 
                  type="password" required
                  placeholder="••••••••"
                  className="w-full border-2 border-sand-200 rounded-xl px-4 py-3 focus:border-terracotta outline-none transition font-semibold text-charcoal placeholder:font-normal placeholder:text-sand-300"
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5">Role</label>
                  <select 
                    className="w-full border-2 border-sand-200 rounded-xl px-4 py-3 focus:border-terracotta outline-none transition font-black text-[11px] uppercase tracking-wider text-charcoal bg-white"
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value})}
                  >
                    <option value="guest">Guest</option>
                    <option value="host">Host</option>
                    <option value="broker">Broker</option>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5">City</label>
                  <input 
                    required
                    placeholder="e.g. Mumbai"
                    className="w-full border-2 border-sand-200 rounded-xl px-4 py-3 focus:border-terracotta outline-none transition font-semibold text-charcoal placeholder:font-normal placeholder:text-sand-300"
                    value={newUser.city}
                    onChange={e => setNewUser({...newUser, city: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={newUser.role === 'admin' ? "col-span-2" : ""}>
                  <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5">State</label>
                  <input 
                    required
                    placeholder="e.g. Maharashtra"
                    className="w-full border-2 border-sand-200 rounded-xl px-4 py-3 focus:border-terracotta outline-none transition font-semibold text-charcoal placeholder:font-normal placeholder:text-sand-300"
                    value={newUser.state}
                    onChange={e => setNewUser({...newUser, state: e.target.value})}
                  />
                </div>
                {newUser.role !== 'admin' && (
                  <div>
                    <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5">Birthdate</label>
                    <PremiumDatePicker 
                      value={newUser.birthdate}
                      onChange={dateStr => setNewUser({...newUser, birthdate: dateStr})}
                      required={newUser.role !== 'admin'}
                    />
                  </div>
                )}
              </div>

              {(newUser.role === 'broker' || newUser.role === 'employee') && (
                <div className="grid grid-cols-2 gap-4 animate-slide-up">
                  <div>
                    <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5">Franchise</label>
                    <input 
                      required
                      placeholder="e.g. Golden"
                      className="w-full border-2 border-sand-200 rounded-xl px-4 py-3 focus:border-terracotta outline-none transition font-semibold text-charcoal placeholder:font-normal placeholder:text-sand-300"
                      value={newUser.franchise}
                      onChange={e => setNewUser({...newUser, franchise: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5">Branch</label>
                    <input 
                      required
                      placeholder="e.g. Bandra"
                      className="w-full border-2 border-sand-200 rounded-xl px-4 py-3 focus:border-terracotta outline-none transition font-semibold text-charcoal placeholder:font-normal placeholder:text-sand-300"
                      value={newUser.branch}
                      onChange={e => setNewUser({...newUser, branch: e.target.value})}
                    />
                  </div>
                </div>
              )}

              {/* Dynamic UID Preview Box */}
              <div className="bg-sand-100/60 border border-sand-200 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-sage/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-sage-dark" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest block mb-0.5">System Generated UID</span>
                    <span className="font-mono font-black text-sm text-charcoal tracking-wider uppercase block">{newUser.uid || 'GENERATING...'}</span>
                  </div>
                </div>
                <span className="text-[9px] font-black bg-sage text-white px-2.5 py-1 rounded-full uppercase tracking-wider">Secure</span>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-sand-200">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 font-black text-xs text-charcoal-muted uppercase tracking-widest hover:text-charcoal transition-all">Cancel</button>
                <button type="submit" className="flex-1 btn-premium py-4 shadow-elevated">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editUser && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-premium animate-slide-up overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-sand-200">
              <div>
                <h3 className="text-2xl font-black text-charcoal leading-none mb-1">Edit User Details</h3>
                <span className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest">Update network user profile parameters</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-terracotta/10 flex items-center justify-center text-terracotta">
                <Edit className="w-5 h-5" />
              </div>
            </div>
            
            <form onSubmit={handleEditUserSubmit} className="space-y-6">
              {/* Profile Image Upload Component */}
              <div className="bg-sand-50/50 border border-sand-200/80 rounded-2xl p-5 mb-4 transition-all duration-300 animate-slide-up">
                <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-3">Profile Image</label>
                {editUser.profile_image ? (
                  <div className="flex items-center space-x-4">
                    <div className="relative group">
                      <img 
                        src={getImageUrl(editUser.profile_image)} 
                        alt="Preview" 
                        className="w-16 h-16 rounded-full object-cover border-2 border-terracotta/80 shadow-md group-hover:opacity-90 transition-opacity"
                      />
                      <button 
                        type="button"
                        onClick={() => setEditUser(prev => ({ ...prev, profile_image: '' }))}
                        className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center shadow transition-transform hover:scale-110 active:scale-95"
                        title="Remove Image"
                      >
                        <span className="font-bold text-xs">×</span>
                      </button>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-sage-dark uppercase tracking-widest block mb-0.5">Uploaded</span>
                      <span className="text-xs font-bold text-charcoal-light block">Image successfully registered</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleEditImageUpload}
                      disabled={uploading}
                      className="w-full text-xs text-charcoal-light file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-wider file:bg-terracotta/10 file:text-terracotta hover:file:bg-terracotta/20 cursor-pointer disabled:opacity-50"
                    />
                    {uploading ? (
                      <span className="text-[10px] font-black text-terracotta uppercase tracking-widest animate-pulse">Uploading to node server...</span>
                    ) : (
                      <span className="text-[9px] font-medium text-charcoal-muted">Supported formats: PNG, JPG, JPEG, WEBP, GIF (Max 8MB)</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5">Full Name</label>
                <input 
                  required
                  placeholder="John Doe"
                  className="w-full border-2 border-sand-200 rounded-xl px-4 py-3 focus:border-terracotta outline-none transition font-semibold text-charcoal placeholder:font-normal placeholder:text-sand-300"
                  value={editUser.full_name || ''}
                  onChange={e => setEditUser({...editUser, full_name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5">Email Address</label>
                  <input 
                    type="email" required
                    placeholder="john@example.com"
                    className="w-full border-2 border-sand-200 rounded-xl px-4 py-3 focus:border-terracotta outline-none transition font-semibold text-charcoal placeholder:font-normal placeholder:text-sand-300"
                    value={editUser.email || ''}
                    onChange={e => setEditUser({...editUser, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5">Phone Number</label>
                  <input 
                    required
                    placeholder="+91..."
                    className="w-full border-2 border-sand-200 rounded-xl px-4 py-3 focus:border-terracotta outline-none transition font-semibold text-charcoal placeholder:font-normal placeholder:text-sand-300"
                    value={editUser.phone || ''}
                    onChange={e => setEditUser({...editUser, phone: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5">Password (Leave blank to keep unchanged)</label>
                <input 
                  type="password"
                  placeholder="••••••••"
                  className="w-full border-2 border-sand-200 rounded-xl px-4 py-3 focus:border-terracotta outline-none transition font-semibold text-charcoal placeholder:font-normal placeholder:text-sand-300"
                  value={editUser.password || ''}
                  onChange={e => setEditUser({...editUser, password: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5">Role</label>
                  <select 
                    className="w-full border-2 border-sand-200 rounded-xl px-4 py-3 focus:border-terracotta outline-none transition font-black text-[11px] uppercase tracking-wider text-charcoal bg-white"
                    value={editUser.role || 'guest'}
                    onChange={e => setEditUser({...editUser, role: e.target.value})}
                  >
                    <option value="guest">Guest</option>
                    <option value="host">Host</option>
                    <option value="broker">Broker</option>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5">City</label>
                  <input 
                    required
                    placeholder="e.g. Mumbai"
                    className="w-full border-2 border-sand-200 rounded-xl px-4 py-3 focus:border-terracotta outline-none transition font-semibold text-charcoal placeholder:font-normal placeholder:text-sand-300"
                    value={editUser.city || ''}
                    onChange={e => setEditUser({...editUser, city: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={editUser.role === 'admin' ? "col-span-2" : ""}>
                  <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5">State</label>
                  <input 
                    required
                    placeholder="e.g. Maharashtra"
                    className="w-full border-2 border-sand-200 rounded-xl px-4 py-3 focus:border-terracotta outline-none transition font-semibold text-charcoal placeholder:font-normal placeholder:text-sand-300"
                    value={editUser.state || ''}
                    onChange={e => setEditUser({...editUser, state: e.target.value})}
                  />
                </div>
                {editUser.role !== 'admin' && (
                  <div>
                    <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5">Birthdate</label>
                    <PremiumDatePicker 
                      value={editUser.birthdate ? editUser.birthdate.substring(0, 10) : ''}
                      onChange={dateStr => setEditUser({...editUser, birthdate: dateStr})}
                      required={editUser.role !== 'admin'}
                    />
                  </div>
                )}
              </div>

              {(editUser.role === 'broker' || editUser.role === 'employee') && (
                <div className="grid grid-cols-2 gap-4 animate-slide-up">
                  <div>
                    <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5">Franchise</label>
                    <input 
                      required
                      placeholder="e.g. Golden"
                      className="w-full border-2 border-sand-200 rounded-xl px-4 py-3 focus:border-terracotta outline-none transition font-semibold text-charcoal placeholder:font-normal placeholder:text-sand-300"
                      value={editUser.franchise || ''}
                      onChange={e => setEditUser({...editUser, franchise: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5">Branch</label>
                    <input 
                      required
                      placeholder="e.g. Bandra"
                      className="w-full border-2 border-sand-200 rounded-xl px-4 py-3 focus:border-terracotta outline-none transition font-semibold text-charcoal placeholder:font-normal placeholder:text-sand-300"
                      value={editUser.branch || ''}
                      onChange={e => setEditUser({...editUser, branch: e.target.value})}
                    />
                  </div>
                </div>
              )}

              {editUser.role === 'host' && (
                <div className="animate-slide-up">
                  <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5">LG Code (Assigned Broker)</label>
                  <input 
                    placeholder="e.g. MH01BUM001"
                    className="w-full border-2 border-sand-200 rounded-xl px-4 py-3 focus:border-terracotta outline-none transition font-semibold text-charcoal placeholder:font-normal placeholder:text-sand-300"
                    value={editUser.lg_code || ''}
                    onChange={e => setEditUser({...editUser, lg_code: e.target.value})}
                  />
                </div>
              )}

              <div className="flex space-x-3 pt-4 border-t border-sand-200">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-4 font-black text-xs text-charcoal-muted uppercase tracking-widest hover:text-charcoal transition-all">Cancel</button>
                <button type="submit" className="flex-1 btn-premium py-4 shadow-elevated">Save Changes</button>
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
                <div className="flex items-center justify-between pb-6 mb-6 border-b border-sand-200">
                  <div className="flex items-center space-x-4">
                    {viewUser.profile_image ? (
                      <img
                        src={getImageUrl(viewUser.profile_image)}
                        alt={viewUser.full_name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-sand-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-terracotta/10 border-2 border-sand-200 flex items-center justify-center font-black text-terracotta text-xl uppercase">
                        {viewUser.full_name ? viewUser.full_name.charAt(0) : '?'}
                      </div>
                    )}
                    <div>
                      <h3 className="text-2xl font-black text-charcoal">{viewUser.full_name}</h3>
                      <p className="text-xs text-charcoal-muted uppercase tracking-widest font-bold">Host KYC Review Dashboard</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {viewUser.kyc_status === 'approved' ? (
                      <span className="px-4 py-2 bg-green-50 text-green-600 rounded-full font-black text-xs uppercase tracking-widest border border-green-200">Approved</span>
                    ) : viewUser.kyc_status === 'rejected' ? (
                      <span className="px-4 py-2 bg-red-50 text-red-600 rounded-full font-black text-xs uppercase tracking-widest border border-red-200">Rejected</span>
                    ) : viewUser.kyc_status === 'pending' ? (
                      <span className="px-4 py-2 bg-amber-50 text-amber-600 rounded-full font-black text-xs uppercase tracking-widest border border-amber-200 animate-pulse">Pending Review</span>
                    ) : (
                      <span className="px-4 py-2 bg-sand-100 text-charcoal-light rounded-full font-black text-xs uppercase tracking-widest border border-sand-200">Unverified</span>
                    )}
                    
                    <button
                      onClick={() => setViewUser(null)}
                      className="p-2 hover:bg-sand-100 rounded-full text-charcoal-light hover:text-charcoal transition-colors border border-sand-200 flex items-center justify-center"
                      title="Back to List"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: Host Details */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-charcoal uppercase tracking-widest border-b border-sand-100 pb-2">Host Information</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-sand-50 rounded-2xl">
                        <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">Email</p>
                        <p className="text-sm font-bold text-charcoal break-all">{viewUser.email}</p>
                      </div>
                      <div className="p-4 bg-sand-50 rounded-2xl">
                        <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">Phone</p>
                        <p className="text-sm font-bold text-charcoal">{viewUser.phone}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-sand-50 rounded-2xl">
                        <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">Location</p>
                        <p className="text-sm font-bold text-charcoal">{viewUser.city || 'Not specified'}, {viewUser.state || ''}</p>
                      </div>
                      <div className="p-4 bg-sand-50 rounded-2xl">
                        <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">Status</p>
                        <p className={`text-sm font-bold ${viewUser.is_active ? 'text-green-600' : 'text-red-600'}`}>
                          {viewUser.is_active ? 'Active Account' : 'Inactive Account'}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-sand-50 rounded-2xl">
                      <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">Host User ID / LG Code</p>
                      <p className="text-xs font-mono text-charcoal-light">{viewUser.user_id} {viewUser.lg_code ? `| LG: ${viewUser.lg_code}` : ''}</p>
                    </div>

                    {viewUser.role === 'host' && (
                      <div className="p-4 bg-sand-50 rounded-2xl">
                        <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">Assigned Broker</p>
                        <div className="flex flex-col space-y-2 mt-2">
                          <select 
                            className="w-full px-3 py-2 bg-white border border-sand-200 rounded-lg text-xs font-bold text-charcoal"
                            value={viewUser.broker_id || ''}
                            onChange={(e) => handleAssignBroker(viewUser.user_id, e.target.value)}
                          >
                            <option value="">-- Assign a Broker --</option>
                            {allBrokers.map(b => (
                              <option key={b.user_id} value={b.user_id}>
                                {b.full_name} ({b.lg_code || b.user_id})
                              </option>
                            ))}
                          </select>
                          {viewUser.broker_id && (
                            <p className="text-[10px] font-bold text-terracotta mt-1 tracking-widest uppercase">
                              Broker ID: {viewUser.broker_id}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {viewUser.role === 'broker' && (
                      <div className="p-4 bg-sand-50 rounded-2xl">
                        <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">Assigned RM (Relationship Manager)</p>
                        <div className="flex flex-col space-y-2 mt-2">
                          <select 
                            className="w-full px-3 py-2 bg-white border border-sand-200 rounded-lg text-xs font-bold text-charcoal"
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
                        <p className="font-black uppercase tracking-wider text-[10px] mb-1">Rejection Remarks</p>
                        <p>{viewUser.kyc_remarks}</p>
                      </div>
                    )}

                    <div className="p-4 bg-sand-50 rounded-2xl">
                      <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">Joined On</p>
                      <p className="text-sm font-bold text-charcoal">
                        {new Date(viewUser.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: KYC Uploads & Agreement */}
                  <div className="space-y-6">
                    <h4 className="text-sm font-black text-charcoal uppercase tracking-widest border-b border-sand-100 pb-2">Uploaded Verification Documents</h4>
                    
                    {viewUser.kyc_documents && viewUser.kyc_documents.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {viewUser.kyc_documents.map((doc, idx) => (
                          <div key={idx} className="p-4 bg-sand-50/50 border border-sand-200 rounded-2xl flex flex-col justify-between space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[9px] font-black text-terracotta uppercase tracking-wider">Document</span>
                                <h5 className="font-bold text-charcoal text-xs mt-0.5 capitalize">{doc.document_type.replace('_', ' ')}</h5>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                doc.status === 'approved' ? 'bg-green-50 text-green-600 border border-green-200' :
                                doc.status === 'rejected' ? 'bg-red-50 text-red-600 border border-red-200' :
                                'bg-amber-50 text-amber-600 border border-amber-200 animate-pulse'
                              }`}>
                                {doc.status || 'pending'}
                              </span>
                            </div>
                            
                            {doc.status === 'rejected' && doc.rejection_reason && (
                              <div className="text-[10px] text-red-600 bg-red-50/50 p-2 rounded-xl border border-red-100 leading-normal">
                                <span className="font-black uppercase tracking-wider text-[8px] block mb-0.5">Reason:</span>
                                {doc.rejection_reason}
                              </div>
                            )}
                            
                            {doc.document_type === 'gst_number' ? (
                              <p className="text-xs font-mono bg-white p-2 rounded-xl border border-sand-200 text-center font-bold text-charcoal">{doc.document_url}</p>
                            ) : (
                              <a
                                href={getImageUrl(doc.document_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full py-2 bg-charcoal hover:bg-terracotta text-white rounded-xl text-[9px] font-black uppercase tracking-widest text-center transition-colors block"
                              >
                                View File
                              </a>
                            )}

                            <div className="flex gap-2 pt-2 border-t border-sand-100">
                              <button
                                type="button"
                                onClick={() => handleUpdateDocumentStatus(viewUser.user_id, doc.document_type, 'approved')}
                                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
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
                                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                  doc.status === 'rejected'
                                    ? 'bg-red-600 text-white cursor-default'
                                    : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                }`}
                                disabled={doc.status === 'rejected'}
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-sand-50 rounded-2xl border border-dashed border-sand-300">
                        <p className="text-xs text-charcoal-muted font-bold">No documents submitted yet.</p>
                      </div>
                    )}

                    {viewUser.agreement_signature && (
                      <div className="p-5 bg-sand-50/50 border border-sand-200 rounded-2xl space-y-3">
                        <h4 className="text-[10px] font-black text-charcoal uppercase tracking-widest border-b border-sand-100 pb-1">GR & Owner Agreement</h4>
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
                          <div className="bg-white border border-sand-200 p-3 rounded-xl flex items-center justify-center h-20 shadow-inner">
                            <img src={getImageUrl(viewUser.agreement_signature)} alt="Drawn Signature" className="max-h-16 object-contain" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* KYC Actions Row */}
                <div className="mt-8 pt-6 border-t border-sand-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {viewUser.kyc_status === 'pending' ? (
                    <>
                      <div className="text-xs text-charcoal-muted font-bold">
                        ⚠️ Verify all documents and signature against local guidelines before approval.
                      </div>
                      <div className="flex space-x-3 w-full sm:w-auto">
                        <button
                          onClick={() => handleRejectKYC(viewUser.user_id)}
                          className="flex-1 sm:flex-none px-6 py-4 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors"
                        >
                          Reject KYC
                        </button>
                        <button
                          onClick={() => handleApproveKYC(viewUser.user_id)}
                          className="flex-1 sm:flex-none px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md"
                        >
                          Approve KYC & Go Live
                        </button>
                      </div>
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
                    className="p-2 hover:bg-sand-100 rounded-full text-charcoal-light hover:text-charcoal transition-colors border border-sand-200 flex items-center justify-center"
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
                    <div className="w-24 h-24 rounded-full bg-terracotta/10 border-4 border-sand-100 flex items-center justify-center font-black text-terracotta text-3xl uppercase mb-4">
                      {viewUser.full_name ? viewUser.full_name.charAt(0) : '?'}
                    </div>
                  )}
                  <h3 className="text-2xl font-black text-charcoal">{viewUser.full_name}</h3>
                  <span className="inline-block px-3 py-1 bg-terracotta/10 text-terracotta text-xs font-black uppercase tracking-widest rounded-full mt-2">
                    {viewUser.role} Account
                  </span>
                </div>
                
                <div className="space-y-4 mb-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-sand-50 rounded-2xl">
                      <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">Email</p>
                      <p className="text-sm font-bold text-charcoal break-all">{viewUser.email}</p>
                    </div>
                    <div className="p-4 bg-sand-50 rounded-2xl">
                      <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">Phone</p>
                      <p className="text-sm font-bold text-charcoal">{viewUser.phone}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-sand-50 rounded-2xl">
                      <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">Location</p>
                      <p className="text-sm font-bold text-charcoal">{viewUser.city || 'Not specified'}</p>
                    </div>
                    <div className="p-4 bg-sand-50 rounded-2xl">
                      <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">Status</p>
                      <p className={`text-sm font-bold ${viewUser.is_active ? 'text-green-600' : 'text-red-600'}`}>
                        {viewUser.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-sand-50 rounded-2xl">
                    <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">User ID</p>
                    <p className="text-xs font-mono text-charcoal-light">{viewUser.user_id}</p>
                  </div>
                  <div className="p-4 bg-sand-50 rounded-2xl">
                    <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">Joined On</p>
                    <p className="text-sm font-bold text-charcoal">
                      {new Date(viewUser.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <button onClick={() => setViewUser(null)} className="w-full btn-premium py-4">Close Details</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject KYC Document Reason Modal */}
      {rejectDocState && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-premium animate-slide-up">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-sand-200">
              <h4 className="text-lg font-black text-charcoal">Reject Document</h4>
              <button 
                onClick={() => setRejectDocState(null)} 
                className="p-1.5 hover:bg-sand-100 rounded-lg text-charcoal-light hover:text-charcoal transition"
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
              className="w-full border-2 border-sand-200 rounded-xl px-3 py-2 text-sm focus:border-terracotta outline-none transition font-semibold text-charcoal placeholder:font-normal placeholder:text-sand-300 min-h-[80px]"
              value={rejectDocState.reason || ''}
              onChange={e => setRejectDocState({ ...rejectDocState, reason: e.target.value })}
            />
            
            <div className="flex space-x-3 mt-5">
              <button 
                type="button" 
                onClick={() => setRejectDocState(null)} 
                className="flex-1 py-3 font-black text-[10px] text-charcoal-muted uppercase tracking-widest hover:text-charcoal transition"
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
                className="flex-1 btn-premium bg-red-600 hover:bg-red-700 border-red-600 py-3 shadow-elevated text-white font-black text-[10px] uppercase tracking-widest"
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
              <div key={property.property_id} className="dashboard-card" data-testid={`property-${property.property_id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <img
                      src={property.images?.[0] || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded'}
                      alt={property.title}
                      className="w-24 h-24 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-charcoal text-lg">{property.title}</h4>
                      <p className="text-sm text-charcoal-light mt-1">
                        {property.city} | {property.bhk_type} | {property.category}
                      </p>
                      <div className="flex items-center space-x-2 mt-3 flex-wrap gap-y-2">
                        <span className="text-lg font-bold text-terracotta">₹{property.price_per_night}</span>
                        <span className="text-sm text-charcoal-light">/night</span>
                        <span
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded ml-2 ${
                            property.status === 'live' ? 'bg-green-100 text-green-700' :
                            property.status === 'under_review' ? 'bg-blue-100 text-blue-700' :
                            property.status === 'pending_verification' ? 'bg-yellow-100 text-yellow-700' :
                            property.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {property.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-wrap justify-end">
                    <button
                      onClick={() => navigate(`/property/${property.property_id}`)}
                      className="flex items-center space-x-2 px-4 py-2 bg-white border border-sand-200 text-charcoal rounded-lg hover:border-terracotta hover:text-terracotta transition font-semibold"
                      title="View property"
                    >
                      <EyeIcon className="w-4 h-4" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => navigate(`/host/list-property?edit=${property.property_id}`)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition font-semibold"
                      title="Edit property"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    {canActOn(property) && (
                      <>
                      <button
                        onClick={() => openVerificationDetails(property)}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition font-semibold"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Verify & Approve</span>
                      </button>
                      <button
                        onClick={() => rejectProperty(property.property_id)}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-semibold"
                      >
                        <XCircle className="w-4 h-4" />
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
                className="w-10 h-10 rounded-full border border-sand-200 flex items-center justify-center text-charcoal hover:bg-sand-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-semibold text-charcoal">
                Page {currentPage} of {Math.ceil(properties.length / itemsPerPage)}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(properties.length / itemsPerPage), p + 1))}
                disabled={currentPage === Math.ceil(properties.length / itemsPerPage)}
                className="w-10 h-10 rounded-full border border-sand-200 flex items-center justify-center text-charcoal hover:bg-sand-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                <h3 className="text-2xl font-black text-charcoal">{activeReviewProperty.title}</h3>
                <p className="text-xs font-black text-charcoal-muted uppercase tracking-widest mt-1">
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
              <div className="p-4 bg-sand-50 rounded-2xl">
                <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">Property Details</p>
                <p className="text-sm font-bold text-charcoal truncate">Property ID: {activeReviewProperty.property_id || 'N/A'}</p>
                <p className="text-xs text-charcoal-light mt-1 truncate">Host ID: {activeReviewProperty.owner_id || 'N/A'}</p>
              </div>
              <div className="p-4 bg-sand-50 rounded-2xl">
                <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">Assigned RM Details</p>
                <p className="text-sm font-bold text-charcoal truncate">RM ID: {activeReviewProperty.rm_id || 'N/A'}</p>
                <p className="text-xs text-charcoal-light mt-1">RM Remarks: "{activeReviewProperty.rm_remarks || 'No remarks provided'}"</p>
              </div>
              <div className="p-4 bg-sand-50 rounded-2xl">
                <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">Field Intelligence (Broker)</p>
                <p className="text-sm font-bold text-charcoal truncate">Broker ID: {activeReviewProperty.broker_id || 'N/A'}</p>
                <p className="text-xs text-charcoal-light mt-1">Broker Remarks: "{activeReviewProperty.broker_remarks || 'No remarks provided'}"</p>
              </div>
            </div>

            {/* Property Images Gallery */}
            {activeReviewProperty.images && activeReviewProperty.images.length > 0 && (
              <div className="mb-6">
                <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-2">Property Images</p>
                <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-sand-300">
                  {activeReviewProperty.images.map((img, idx) => (
                    <img 
                      key={idx}
                      src={getImageUrl(img)} 
                      alt={`Property Image ${idx + 1}`} 
                      className="w-40 h-28 object-cover rounded-xl border border-sand-200 shadow-sm flex-shrink-0"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Info */}
            <div className="p-5 bg-sand-50/50 border border-sand-200/80 rounded-2xl mb-6">
              <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-3">Listing Details</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <span className="text-[9px] font-bold text-charcoal-muted uppercase block">Category</span>
                  <span className="font-bold text-charcoal text-xs capitalize">{activeReviewProperty.category || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-charcoal-muted uppercase block">BHK Type</span>
                  <span className="font-bold text-charcoal text-xs uppercase">{activeReviewProperty.bhk_type || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-charcoal-muted uppercase block">Price per Night</span>
                  <span className="font-bold text-terracotta text-xs">₹{activeReviewProperty.price_per_night || 0}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-charcoal-muted uppercase block">Location</span>
                  <span className="font-bold text-charcoal text-xs">{activeReviewProperty.city || 'N/A'}, {activeReviewProperty.state || ''}</span>
                </div>
              </div>

              {activeReviewProperty.address && (
                <div className="mb-3">
                  <span className="text-[9px] font-bold text-charcoal-muted uppercase block">Full Address</span>
                  <span className="text-xs font-semibold text-charcoal-light">{activeReviewProperty.address}</span>
                </div>
              )}

              {activeReviewProperty.description && (
                <div className="mb-3">
                  <span className="text-[9px] font-bold text-charcoal-muted uppercase block">Description</span>
                  <p className="text-xs text-charcoal-light leading-relaxed whitespace-pre-wrap">{activeReviewProperty.description}</p>
                </div>
              )}

              {activeReviewProperty.amenities && activeReviewProperty.amenities.length > 0 && (
                <div>
                  <span className="text-[9px] font-bold text-charcoal-muted uppercase block mb-1">Amenities</span>
                  <div className="flex flex-wrap gap-1">
                    {activeReviewProperty.amenities.map((amenity, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-sand-200/50 text-charcoal text-[9px] font-semibold rounded">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Evidence Video Link */}
            {activeReviewProperty.video_url && (
              <div className="p-4 bg-sand-50 rounded-2xl mb-6">
                <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">Walkthrough Video</p>
                <a 
                  href={activeReviewProperty.video_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs font-bold text-terracotta hover:underline flex items-center space-x-1"
                >
                  <span>🎥 Watch Video Walkthrough</span>
                </a>
              </div>
            )}

            {/* Compliance Checklist Item Review */}
            <div className="mb-6">
              <h4 className="text-xs font-black text-charcoal-muted uppercase tracking-widest mb-4">Compliance Checklist Audit</h4>
              <div className="space-y-3">
                {Object.keys(CHECKLIST_LABELS).map((key) => {
                  const brokerRMVal = activeReviewProperty.checklist?.[key];
                  const adminVal = adminChecklist[key];
                  return (
                    <div key={key} className="flex items-center justify-between p-3.5 bg-sand-50/50 border border-sand-200/60 rounded-2xl hover:bg-sand-50 transition-all">
                      <div className="flex-1 mr-4">
                        <p className="text-sm font-bold text-charcoal">{CHECKLIST_LABELS[key]}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[10px] font-bold text-charcoal-muted uppercase tracking-wider">Broker/RM Status:</span>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                            brokerRMVal 
                              ? 'bg-green-50 text-green-700' 
                              : 'bg-red-50 text-red-700'
                          }`}>
                            {brokerRMVal ? '✔ Compliant' : '✘ Deficient'}
                          </span>
                        </div>
                      </div>

                      {/* Admin Verification Switch */}
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setAdminChecklist({ ...adminChecklist, [key]: true })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            adminVal === true
                              ? 'bg-green-600 text-white shadow-elevated scale-105 border-2 border-green-600'
                              : 'bg-white text-charcoal-light border-2 border-sand-200 hover:border-green-600/30'
                          }`}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdminChecklist({ ...adminChecklist, [key]: false })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            adminVal === false
                              ? 'bg-red-600 text-white shadow-elevated scale-105 border-2 border-red-600'
                              : 'bg-white text-charcoal-light border-2 border-sand-200 hover:border-red-600/30'
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
                <h4 className="text-xs font-black text-charcoal-muted uppercase tracking-widest mb-4">Geo-Tagged Evidence Photos</h4>
                <div className="grid grid-cols-2 gap-4">
                  {activeReviewProperty.geo_tagged_photos.map((photo, idx) => (
                    <div key={idx} className="relative group rounded-2xl overflow-hidden border border-sand-200 bg-sand-50 p-2">
                      <img 
                        src={getImageUrl(photo.photo_url)} 
                        alt={photo.description || 'Evidence Photo'} 
                        className="w-full h-36 object-cover rounded-xl"
                      />
                      <div className="mt-2">
                        <p className="text-[10px] font-bold text-charcoal truncate">{photo.description || 'Verified Site View'}</p>
                        <p className="text-[9px] text-charcoal-muted mt-0.5">GPS: {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3 pt-6 border-t border-sand-200">
              <button 
                type="button" 
                onClick={() => setActiveReviewProperty(null)} 
                className="flex-1 py-4 font-black text-xs text-charcoal-muted uppercase tracking-widest hover:text-charcoal transition-all"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => rejectProperty(activeReviewProperty.property_id)} 
                className="flex-1 py-4 font-black text-xs bg-red-50 text-red-700 rounded-xl uppercase tracking-widest hover:bg-red-100 transition-all"
              >
                Reject Listing
              </button>
              <button 
                type="button" 
                onClick={() => handleFinalApprove(activeReviewProperty.property_id)} 
                className="flex-1 btn-premium py-4 shadow-elevated"
              >
                Approve & Go Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Property Rejection Reason Modal */}
      {propertyRejectionState && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-premium animate-slide-up">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-sand-200">
              <h4 className="text-lg font-black text-charcoal">Reject Property Listing</h4>
              <button 
                onClick={() => setPropertyRejectionState(null)} 
                className="p-1.5 hover:bg-sand-100 rounded-lg text-charcoal-light hover:text-charcoal transition"
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
              className="w-full border-2 border-sand-200 rounded-xl px-3 py-2 text-sm focus:border-terracotta outline-none transition font-semibold text-charcoal placeholder:font-normal placeholder:text-sand-300 min-h-[80px]"
              value={propertyRejectionState.reason || ''}
              onChange={e => setPropertyRejectionState({ ...propertyRejectionState, reason: e.target.value })}
            />
            
            <div className="flex space-x-3 mt-5">
              <button 
                type="button" 
                onClick={() => setPropertyRejectionState(null)} 
                className="flex-1 py-3 font-black text-[10px] text-charcoal-muted uppercase tracking-widest hover:text-charcoal transition"
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
                className="flex-1 btn-premium bg-red-600 hover:bg-red-700 border-red-600 py-3 shadow-elevated text-white font-black text-[10px] uppercase tracking-widest"
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
const BookingManagement = () => {
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
              className="dashboard-card hover:shadow-md transition-all border border-sand-200"
              data-testid={`booking-${booking.booking_id}`}
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between border-b border-sand-200 pb-4 mb-4 gap-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-terracotta/10 flex items-center justify-center text-terracotta">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-charcoal-muted uppercase tracking-widest block">
                      Booking ID
                    </span>
                    <span className="font-mono font-black text-charcoal tracking-wide text-sm">
                      {booking.booking_id}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                  <span className="text-xs text-charcoal-muted">
                    Booked on: {formatDate(booking.created_at)}
                  </span>
                  <span
                    className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full border ${getStatusColor(
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
                  <h4 className="text-xs font-black text-charcoal-muted uppercase tracking-widest border-b border-sand-100 pb-1">
                    Property Details
                  </h4>
                  {booking.property ? (
                    <div className="flex items-start space-x-3">
                      {booking.property.images?.[0] ? (
                        <img
                          src={getImageUrl(booking.property.images[0])}
                          alt={booking.property.title}
                          className="w-16 h-16 rounded-xl object-cover border border-sand-200"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-sage/10 border border-sand-200 flex items-center justify-center text-sage font-bold">
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
                          <span className="inline-block px-1.5 py-0.5 bg-sand-100 text-charcoal-muted text-[9px] font-black uppercase rounded">
                            {booking.property.bhk_type}
                          </span>
                          <span className="inline-block px-1.5 py-0.5 bg-sand-100 text-charcoal-muted text-[9px] font-black uppercase rounded">
                            {booking.property.category}
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
                    <h4 className="text-xs font-black text-charcoal-muted uppercase tracking-widest border-b border-sand-100 pb-1">
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
                    <h4 className="text-xs font-black text-charcoal-muted uppercase tracking-widest border-b border-sand-100 pb-1">
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
              <div className="flex flex-wrap items-center justify-between border-t border-sand-200 mt-4 pt-4 bg-sand-50/50 -mx-6 -mb-6 px-6 py-4 rounded-b-2xl gap-4">
                <div className="flex items-center space-x-6">
                  <div>
                    <span className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest block">
                      Duration
                    </span>
                    <span className="text-xs font-bold text-charcoal">
                      {formatDate(booking.check_in_date)} &mdash; {formatDate(booking.check_out_date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest block">
                      Guests
                    </span>
                    <span className="text-xs font-bold text-charcoal">
                      {booking.number_of_guests} {booking.number_of_guests === 1 ? 'Guest' : 'Guests'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-4 mt-2 sm:mt-0 ml-auto md:ml-0">
                  <div className="text-right">
                    <span className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest block">
                      Total Paid
                    </span>
                    <span className="text-lg font-black text-terracotta">
                      ₹{(booking.total_amount || 0).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded ${getPaymentStatusColor(
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
            <div className="flex justify-between items-start mb-6 border-b border-sand-200 pb-4">
              <div>
                <h3 className="text-2xl font-black text-charcoal">Booking Invoice Ledger</h3>
                <span className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest">
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
              <div className="flex justify-between items-center bg-sand-50 p-4 rounded-2xl border border-sand-200">
                <div>
                  <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest">
                    Booking Status
                  </p>
                  <span
                    className={`inline-block px-2.5 py-0.5 text-xs font-black uppercase tracking-wider rounded-full border mt-1 ${getStatusColor(
                      selectedBooking.booking_status
                    )}`}
                  >
                    {selectedBooking.booking_status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest">
                    Payment Status
                  </p>
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-black uppercase tracking-wider rounded mt-1 ${getPaymentStatusColor(
                      selectedBooking.payment_status
                    )}`}
                  >
                    {selectedBooking.payment_status}
                  </span>
                </div>
              </div>

              {/* Dates & Guest */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-sand-50 rounded-2xl">
                  <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">
                    Check-in Date
                  </p>
                  <p className="text-sm font-bold text-charcoal">
                    {formatDate(selectedBooking.check_in_date)}
                  </p>
                </div>
                <div className="p-4 bg-sand-50 rounded-2xl">
                  <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">
                    Check-out Date
                  </p>
                  <p className="text-sm font-bold text-charcoal">
                    {formatDate(selectedBooking.check_out_date)}
                  </p>
                </div>
              </div>

              {/* Breakdown Ledger */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-charcoal-muted uppercase tracking-widest">
                  Financial Breakdown
                </h4>
                <div className="border border-sand-200 rounded-2xl p-4 space-y-2.5 font-semibold text-sm">
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
                  <div className="border-t border-sand-200 pt-2.5 flex justify-between font-black text-charcoal text-base">
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
                <div className="p-4 bg-sand-50 rounded-2xl space-y-1">
                  <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">
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
    rating: '',
    trusted_text: ''
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

  const fetchCMSContent = async () => {
    try {
      setLoading(true);
      const res = await cmsAPI.getAdminContent('landing');
      const docs = res.data.content || [];
      setContent(docs);

      const heroDoc = docs.find(d => d.section === 'hero');
      if (heroDoc) setHeroData(heroDoc.content_data);

      const howItWorksDoc = docs.find(d => d.section === 'how_it_works');
      if (howItWorksDoc) setHowItWorksData(howItWorksDoc.content_data);

      const testimonialsDoc = docs.find(d => d.section === 'testimonials');
      if (testimonialsDoc) setTestimonialsData(testimonialsDoc.content_data);

      const blogDoc = docs.find(d => d.section === 'blog');
      if (blogDoc) setBlogData(blogDoc.content_data);

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
      await cmsAPI.updateContent(doc.content_id, { content_data: data });
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
          <h3 className="text-2xl font-black text-charcoal">Landing Page CMS Settings</h3>
          <p className="text-sm text-charcoal-light">Manage Hero section, Blog posts, Guest testimonials, and onboarding steps data.</p>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex flex-wrap gap-2.5 p-1.5 bg-sand-100/60 rounded-2xl mb-8 max-w-2xl">
        {[
          { id: 'hero', label: 'Hero Details', icon: Sparkles },
          { id: 'how_it_works', label: 'How It Works', icon: ListTodo },
          { id: 'testimonials', label: 'Testimonials', icon: Heart },
          { id: 'blog', label: 'Blog Posts', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center space-x-2 px-5 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-terracotta text-white shadow-md shadow-terracotta/20 scale-[1.02]'
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
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 border border-sand-200/80 shadow-premium transition-all duration-300 hover:shadow-2xl">
        
        {/* HERO TAB */}
        {activeSubTab === 'hero' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-sand-100">
              <div className="p-2.5 bg-terracotta/10 rounded-xl text-terracotta">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-black text-charcoal">Hero Section Configuration</h4>
                <p className="text-xs text-charcoal-muted font-medium">Configure the main above-the-fold content of your homepage.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative group">
                <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Sub Tag</label>
                <input
                  className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3 outline-none transition-all duration-300 font-semibold text-charcoal bg-sand-50/20 focus:bg-white text-sm"
                  value={heroData.sub_tag}
                  onChange={e => setHeroData({ ...heroData, sub_tag: e.target.value })}
                  placeholder="e.g. Luxury Rentals India"
                />
              </div>
              <div className="relative group">
                <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Rating Display Text</label>
                <input
                  className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3 outline-none transition-all duration-300 font-semibold text-charcoal bg-sand-50/20 focus:bg-white text-sm"
                  value={heroData.rating}
                  onChange={e => setHeroData({ ...heroData, rating: e.target.value })}
                  placeholder="e.g. 4.9/5 Rating"
                />
              </div>
            </div>

            <div className="relative group">
              <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Heading Title (HTML Supported)</label>
              <input
                className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3 outline-none transition-all duration-300 font-semibold text-charcoal bg-sand-50/20 focus:bg-white text-sm"
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
              <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Subtitle / Paragraph Description</label>
              <textarea
                rows={3}
                className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3 outline-none transition-all duration-300 font-semibold text-charcoal bg-sand-50/20 focus:bg-white text-sm leading-relaxed"
                value={heroData.subtitle}
                onChange={e => setHeroData({ ...heroData, subtitle: e.target.value })}
                placeholder="Describe your platform values and offerings..."
              />
            </div>

            <div className="relative group">
              <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Trusted By Text</label>
              <input
                className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3 outline-none transition-all duration-300 font-semibold text-charcoal bg-sand-50/20 focus:bg-white text-sm"
                value={heroData.trusted_text}
                onChange={e => setHeroData({ ...heroData, trusted_text: e.target.value })}
                placeholder="e.g. Trusted by 10,000+ happy families across India"
              />
            </div>

            <div className="relative group">
              <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Hero Background Image</label>
              <div className="flex items-stretch space-x-3">
                <div className="relative flex-1">
                  <input
                    className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3.5 outline-none transition-all duration-300 font-semibold text-charcoal bg-sand-50/20 focus:bg-white text-sm"
                    value={heroData.image_url}
                    onChange={e => setHeroData({ ...heroData, image_url: e.target.value })}
                    placeholder="Image URL"
                  />
                </div>
                <label className="btn-premium px-6 flex items-center justify-center space-x-2 text-sm font-semibold rounded-2xl cursor-pointer hover:shadow-lg transition-all duration-300">
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleImageUpload(e, 'hero')}
                  />
                </label>
              </div>
              
              {heroData.image_url && (
                <div className="mt-5 relative group overflow-hidden rounded-2xl border border-sand-200/80 shadow-md aspect-video max-h-64">
                  <img src={getImageUrl(heroData.image_url)} alt="Hero Preview" className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-4">
                    <span className="text-white text-xs font-semibold tracking-wide bg-charcoal/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">Active Hero Background</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-sand-150">
              <button
                onClick={() => handleSave('hero', heroData)}
                disabled={saving}
                className="w-full sm:w-auto btn-premium px-8 py-3.5 flex items-center justify-center space-x-2.5 shadow-md shadow-terracotta/15 active:scale-95 transition-all"
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
                <h4 className="text-lg font-black text-charcoal">How It Works Steps</h4>
                <p className="text-xs text-charcoal-muted font-medium">Configure onboarding steps and bullet points displayed on the landing page.</p>
              </div>
            </div>

            <div className="space-y-6">
              {howItWorksData.steps?.map((step, index) => (
                <div key={step.id} className="p-6 bg-sand-50/50 rounded-3xl border border-sand-200/80 space-y-5 hover:bg-white hover:shadow-lg transition-all duration-300">
                  <div className="flex justify-between items-center pb-3 border-b border-sand-200/60">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-6 h-6 rounded-full bg-terracotta text-white flex items-center justify-center text-xs font-black">
                        {step.id}
                      </span>
                      <span className="text-sm font-black text-charcoal uppercase tracking-wider">
                        Step Configuration
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Short Title (Tab)</label>
                      <input
                        className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-sm"
                        value={step.shortTitle}
                        onChange={e => {
                          const updated = [...howItWorksData.steps];
                          updated[index] = { ...updated[index], shortTitle: e.target.value };
                          setHowItWorksData({ steps: updated });
                        }}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Heading Title</label>
                      <input
                        className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-sm"
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
                      <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Subtitle</label>
                      <input
                        className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-sm"
                        value={step.subtitle}
                        onChange={e => {
                          const updated = [...howItWorksData.steps];
                          updated[index] = { ...updated[index], subtitle: e.target.value };
                          setHowItWorksData({ steps: updated });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Lucide Icon Name</label>
                      <select
                        className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-sm appearance-none cursor-pointer"
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
                    <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Step Detailed Paragraph</label>
                    <textarea
                      rows={2}
                      className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-sm leading-relaxed"
                      value={step.paragraph}
                      onChange={e => {
                        const updated = [...howItWorksData.steps];
                        updated[index] = { ...updated[index], paragraph: e.target.value };
                        setHowItWorksData({ steps: updated });
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Bullet Points</label>
                    <div className="space-y-3">
                      {step.bullets?.map((bullet, bIndex) => (
                        <div key={bIndex} className="flex items-center space-x-2.5 group/bullet">
                          <input
                            className="flex-1 border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2 bg-white outline-none transition font-semibold text-charcoal text-xs"
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
                        className="text-xs font-black text-emerald-600 uppercase tracking-wider hover:text-emerald-700 hover:underline flex items-center space-x-1.5 py-1"
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
                className="w-full sm:w-auto btn-premium px-8 py-3.5 flex items-center justify-center space-x-2.5 shadow-md shadow-terracotta/15 active:scale-95 transition-all"
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
                  <h4 className="text-lg font-black text-charcoal">Guest Testimonials</h4>
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
                className="btn-premium px-5 py-2.5 rounded-2xl flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" />
                <span>Add Testimonial</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {testimonialsData.items?.map((item, index) => (
                <div key={item.id || index} className="p-6 bg-sand-50/50 rounded-3xl border border-sand-200/80 space-y-5 relative group hover:bg-white hover:shadow-lg transition-all duration-300">
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
                      <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Author Name</label>
                      <input
                        className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-sm"
                        value={item.name}
                        onChange={e => {
                          const updated = [...testimonialsData.items];
                          updated[index] = { ...updated[index], name: e.target.value };
                          setTestimonialsData({ items: updated });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Role / Subtitle</label>
                      <input
                        className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-sm"
                        value={item.role}
                        onChange={e => {
                          const updated = [...testimonialsData.items];
                          updated[index] = { ...updated[index], role: e.target.value };
                          setTestimonialsData({ items: updated });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Rating Stars (1-5)</label>
                      <select
                        className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-sm cursor-pointer"
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
                    <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Comment Text</label>
                    <textarea
                      rows={2.5}
                      className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-sm leading-relaxed"
                      value={item.comment}
                      onChange={e => {
                        const updated = [...testimonialsData.items];
                        updated[index] = { ...updated[index], comment: e.target.value };
                        setTestimonialsData({ items: updated });
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Avatar Image</label>
                    <div className="flex items-stretch space-x-3">
                      <input
                        className="flex-1 border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-3 outline-none transition-all font-semibold text-charcoal bg-white text-sm"
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
                      <div className="mt-3.5 flex items-center space-x-3.5 bg-white p-2.5 rounded-2xl border border-sand-200 w-fit shadow-sm">
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
                className="w-full sm:w-auto btn-premium px-8 py-3.5 flex items-center justify-center space-x-2.5 shadow-md shadow-terracotta/15 active:scale-95 transition-all"
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

        {/* BLOG TAB */}
        {activeSubTab === 'blog' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-sand-100 mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-terracotta/10 rounded-xl text-terracotta">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-charcoal">Journal Blog Posts</h4>
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
                className="btn-premium px-5 py-2.5 rounded-2xl flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" />
                <span>Add Blog Post</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {blogData.posts?.map((post, index) => (
                <div key={post.id || index} className="p-6 bg-sand-50/50 rounded-3xl border border-sand-200/80 space-y-5 relative group hover:bg-white hover:shadow-lg transition-all duration-300">
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
                      <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Article Title</label>
                      <input
                        className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-sm"
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
                        <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Author</label>
                        <input
                          className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-3 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-xs"
                          value={post.author}
                          onChange={e => {
                            const updated = [...blogData.posts];
                            updated[index] = { ...updated[index], author: e.target.value };
                            setBlogData({ posts: updated });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Date</label>
                        <input
                          className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-3 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-xs"
                          value={post.date}
                          onChange={e => {
                            const updated = [...blogData.posts];
                            updated[index] = { ...updated[index], date: e.target.value };
                            setBlogData({ posts: updated });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Read Time</label>
                        <input
                          className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-3 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-xs"
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
                    <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Excerpt Summary</label>
                    <textarea
                      rows={2.5}
                      className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-sm leading-relaxed"
                      value={post.excerpt}
                      onChange={e => {
                        const updated = [...blogData.posts];
                        updated[index] = { ...updated[index], excerpt: e.target.value };
                        setBlogData({ posts: updated });
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Cover Image</label>
                    <div className="flex items-stretch space-x-3">
                      <input
                        className="flex-1 border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-3 outline-none transition-all font-semibold text-charcoal bg-white text-sm"
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
                      <div className="mt-4 relative group overflow-hidden rounded-2xl border border-sand-200/80 shadow-md aspect-video max-h-40 w-fit">
                        <img src={getImageUrl(post.image_url)} alt="Cover Preview" className="w-64 h-full object-cover group-hover:scale-105 transition-all duration-500" />
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
                className="w-full sm:w-auto btn-premium px-8 py-3.5 flex items-center justify-center space-x-2.5 shadow-md shadow-terracotta/15 active:scale-95 transition-all"
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

      </div>
    </div>
  );
};

// Subscription Management Component
const SubscriptionManagement = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewPlan, setViewPlan] = useState(null);
  const [newPlan, setNewPlan] = useState({
    plan_name: '',
    plan_type: '1bhk',
    price_monthly: '',
    price_annual: '',
    description: ''
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await subscriptionAPI.getPlans();
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
      if (newPlan.plan_id) {
        await subscriptionAPI.updatePlan(newPlan.plan_id, newPlan);
      } else {
        await subscriptionAPI.createPlan(newPlan);
      }
      setShowAddModal(false);
      setNewPlan({ plan_name: '', plan_type: '1bhk', price_monthly: '', price_annual: '', description: '' });
      fetchPlans();
    } catch (error) {
      alert('Failed to save plan');
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Deactivate this plan?')) return;
    try {
      await subscriptionAPI.deletePlan(planId);
      fetchPlans();
    } catch (error) {
      alert('Failed to delete plan');
    }
  };

  return (
    <div data-testid="subscription-management">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-charcoal">Subscription Management</h3>
        <button 
          onClick={() => {
            setNewPlan({ plan_name: '', plan_type: '1bhk', price_monthly: '', price_annual: '', description: '' });
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
                  <span className="inline-block px-2 py-1 bg-sage/10 text-sage-dark text-[10px] font-black uppercase tracking-widest rounded mb-2">
                    {plan.plan_type}
                  </span>
                  <h4 className="text-lg font-bold text-charcoal">{plan.plan_name}</h4>
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
              <div className="space-y-2 pt-4 border-t border-sand-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-charcoal-muted font-bold uppercase">Monthly</span>
                  <span className="text-lg font-black text-terracotta">₹{(plan.price_monthly || 0).toLocaleString('en-IN')}</span>
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
            <h3 className="text-2xl font-black text-charcoal mb-6">
              {newPlan.plan_id ? 'Edit Plan' : 'New Subscription Plan'}
            </h3>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1">Plan Name</label>
                <input 
                  required
                  className="w-full border-2 border-sand-200 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
                  value={newPlan.plan_name}
                  onChange={e => setNewPlan({...newPlan, plan_name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1">BHK Type</label>
                  <select 
                    className="w-full border-2 border-sand-200 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
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
                  <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1">Monthly Price</label>
                  <input 
                    type="number" required
                    className="w-full border-2 border-sand-200 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
                    value={newPlan.price_monthly}
                    onChange={e => setNewPlan({...newPlan, price_monthly: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1">Annual Price</label>
                <input 
                  type="number" required
                  className="w-full border-2 border-sand-200 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
                  value={newPlan.price_annual}
                  onChange={e => setNewPlan({...newPlan, price_annual: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1">Description</label>
                <textarea 
                  required rows={3}
                  className="w-full border-2 border-sand-200 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
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
            <h3 className="text-2xl font-black text-charcoal mb-2">{viewPlan.plan_name}</h3>
            <span className="inline-block px-3 py-1 bg-sage/10 text-sage-dark text-[10px] font-black uppercase tracking-widest rounded-full mb-6">
              {viewPlan.plan_type} Configuration
            </span>
            <div className="space-y-4 mb-8">
              <div className="p-4 bg-sand-50 rounded-2xl">
                <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">Monthly Cost</p>
                <p className="text-2xl font-black text-terracotta">₹{(viewPlan.price_monthly || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 bg-sand-50 rounded-2xl">
                <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">Annual Cost</p>
                <p className="text-2xl font-black text-terracotta">₹{(viewPlan.price_annual || 0).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-2">Description</p>
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
