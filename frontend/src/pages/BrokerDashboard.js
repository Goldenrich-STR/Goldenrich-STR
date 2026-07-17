import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient, { verificationAPI, getImageUrl, accountAPI, uploadAPI } from '../services/api';
import { createPortal } from 'react-dom';
import { formatCategoryLabel, formatDisplayLabel, formatPropertyTypeLabel, formatReadableText } from '../lib/displayLabels';
import { NotificationBell } from '../components/NotificationCenter';
import { 
  Users, Building2, FileCheck, Target, IndianRupee, 
  AlertCircle, Plus, CheckCircle, XCircle, Clock, 
  MapPin, Camera, LogOut, Bell, ChevronRight, ChevronLeft,
  CheckCircle2, Upload, FileText, Eye, Trash2, Check, User, Landmark, Briefcase
} from 'lucide-react';

const BrokerDashboard = () => {
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
      const response = await apiClient.get('/broker/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats ? [
    { 
      label: 'My Owners', 
      value: stats.owners.total, 
      icon: Users, 
      color: 'terracotta'
    },
    { 
      label: 'Total Properties', 
      value: stats.properties.total, 
      icon: Building2, 
      color: 'sage',
      subtext: `${stats.properties.live} Live`
    },
    { 
      label: 'Pending Verifications', 
      value: stats.verifications.pending, 
      icon: FileCheck, 
      color: 'terracotta'
    },
    { 
      label: 'Total Commission', 
      value: `₹${(stats.commission.total / 100).toLocaleString('en-IN')}`, 
      icon: IndianRupee, 
      color: 'sage',
      subtext: `₹${(stats.commission.paid / 100).toLocaleString('en-IN')} Paid`
    },
  ] : [];

  return (
    <div className="min-h-screen bg-stone selection:bg-terracotta selection:text-white">
      {/* Header */}
      <header className="glass px-4 md:px-8 lg:px-12 py-4 sticky top-0 z-50">
        <div className="w-full flex justify-between items-center gap-2">
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => navigate('/')}
          >
            <img src="/logo.png" alt="X-Space360 Logo" className="h-8 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-2 md:gap-6">
            <NotificationBell />
            <div 
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 px-2 md:px-4 py-2 bg-white/50 border border-gray-100 rounded-full shadow-sm cursor-pointer hover:border-terracotta transition-all shrink-0"
            >
               <div className="w-7 h-7 rounded-full bg-sage flex items-center justify-center text-[10px] font-bold tracking-tight text-white shrink-0">
                  {user?.full_name?.[0]}
               </div>
               <span className="hidden sm:block text-[10px] font-bold tracking-tight text-charcoal uppercase tracking-widest whitespace-nowrap">{user?.full_name?.split(' ')[0]}</span>
            </div>
            <button
              onClick={() => {
                navigate('/');
                setTimeout(() => {
                  logout();
                }, 50);
              }}
              className="flex items-center space-x-1 text-[10px] font-bold tracking-tight text-terracotta uppercase tracking-[0.2em] hover:underline transition-all"
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="w-full px-4 md:px-8 lg:px-12 py-10 mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12 animate-fade-in">
          <div>
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-charcoal tracking-tight mb-2" data-testid="dashboard-title">
              Operational Command
            </h2>
            <p className="text-charcoal-muted font-bold text-xs uppercase tracking-widest">Global overview of your owner network and properties</p>
          </div>

        </div>

        {/* Modern Navigation Tabs */}
        <div className="flex space-x-4 mb-10 overflow-x-auto pb-4 scrollbar-hide no-scrollbar" data-testid="broker-tabs">
          {[
            { id: 'overview', label: 'OVERVIEW', icon: Building2 },
            { id: 'owners', label: 'MY OWNERS', icon: Users },
            { id: 'properties', label: 'PROPERTIES', icon: Building2 },
            { id: 'verifications', label: 'VERIFICATIONS', icon: FileCheck },
            { id: 'leads', label: 'LEADS', icon: Target },
            { id: 'commissions', label: 'COMMISSIONS', icon: IndianRupee },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-3 px-6 py-4 rounded-2xl font-bold tracking-tight text-[10px] tracking-widest transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-charcoal text-white shadow-elevated'
                  : 'bg-white text-charcoal-muted border border-gray-100 hover:border-terracotta'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-terracotta' : ''}`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>        {/* Tab Content Section */}
        <div className="transition-all duration-500">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div data-testid="overview-section" className="animate-slide-up">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white rounded-3xl animate-pulse"></div>)}
                </div>
              ) : (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12" data-testid="stats-grid">
                    {statCards.map((stat, idx) => (
                      <div key={idx} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-premium group hover:border-terracotta transition-all duration-500" data-testid={`stat-card-${idx}`}>
                        <div className="bg-stone w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-terracotta/5 transition-colors">
                           <stat.icon className="w-6 h-6 text-terracotta" />
                        </div>
                        <p className="text-3xl font-bold tracking-tight text-charcoal tracking-tighter mb-1">{stat.value}</p>
                        <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-[0.2em]">{stat.label}</p>
                        {stat.subtext && (
                          <div className="mt-4 pt-4 border-t border-sand-100 flex items-center justify-between">
                             <span className="text-[9px] font-bold tracking-tight text-sage-dark bg-sage/10 px-2 py-0.5 rounded-full">{stat.subtext}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pending Verifications Alert */}
                  {stats && stats.verifications.pending > 0 && (
                    <div className="bg-white rounded-3xl p-8 border-l-8 border-terracotta shadow-premium mb-12 flex flex-col md:flex-row items-center justify-between gap-6" data-testid="pending-alert">
                      <div className="flex items-center space-x-6">
                        <div className="bg-terracotta/10 p-4 rounded-2xl animate-pulse">
                           <Clock className="w-8 h-8 text-terracotta" />
                        </div>
                        <div>
                          <p className="text-xl font-bold tracking-tight text-charcoal tracking-tight mb-1">
                            {stats.verifications.pending} Physical Inspections Required
                          </p>
                          <p className="text-xs font-bold text-charcoal-muted uppercase tracking-widest">Site visits must be completed for remote RM review</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('verifications')}
                        className="btn-premium px-8 py-4 shadow-premium whitespace-nowrap"
                      >
                        Action Queue
                      </button>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="bg-white border border-gray-100 rounded-3xl p-10 shadow-premium" data-testid="quick-actions">
                    <h3 className="text-xl font-bold tracking-tight text-charcoal tracking-tight mb-8">System Shortcuts</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { id: 'leads', label: 'GENERATE LEAD', icon: Target, color: 'text-terracotta' },
                        { id: 'verifications', label: 'SITE INSPECTION', icon: FileCheck, color: 'text-sage' },
                        { id: 'owners', label: 'NETWORK VIEW', icon: Users, color: 'text-charcoal' }
                      ].map(action => (
                        <button
                          key={action.id}
                          onClick={() => setActiveTab(action.id)}
                          className="flex items-center justify-between p-6 bg-stone/40 border border-sand-200 rounded-3xl hover:bg-white hover:border-terracotta hover:shadow-premium transition-all group"
                          data-testid={`action-${action.id}`}
                        >
                          <div className="flex items-center space-x-4">
                             <action.icon className={`w-6 h-6 ${action.color}`} />
                             <span className="text-[10px] font-bold tracking-tight text-charcoal-muted group-hover:text-charcoal uppercase tracking-[0.2em]">{action.label}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-charcoal-muted/30 group-hover:text-terracotta group-hover:translate-x-1 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* My Owners Tab */}
        {activeTab === 'owners' && <MyOwnersSection />}

        {/* Properties Tab */}
        {activeTab === 'properties' && <PropertiesSection />}

        {/* Verifications Tab */}
        {activeTab === 'verifications' && <VerificationsSection />}

        {/* Leads Tab */}
        {activeTab === 'leads' && <LeadsSection />}

        {/* Commissions Tab */}
        {activeTab === 'commissions' && <CommissionsSection />}

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
      </div>
    </div>
  );
};

// My Owners Section
const MyOwnersSection = () => {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOwnerKyc, setSelectedOwnerKyc] = useState(null);

  useEffect(() => {
    fetchOwners();
  }, []);

  const fetchOwners = async () => {
    try {
      const response = await apiClient.get('/broker/my-owners');
      setOwners(response.data.owners || []);
    } catch (error) {
      console.error('Error fetching owners:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="owners-section" className="animate-slide-up">
      <div className="flex items-center mb-8">
         <h3 className="text-2xl font-bold tracking-tight text-charcoal tracking-tight">Owner Network</h3>
         <div className="ml-4 h-px flex-1 bg-sand-200"></div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {[1,2,3,4].map(i => <div key={i} className="h-40 bg-white rounded-3xl animate-pulse"></div>)}
        </div>
      ) : owners.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="owners-list">
          {owners.map((owner) => (
            <div key={owner.user_id} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-premium hover:border-terracotta transition-all duration-300 group" data-testid={`owner-${owner.user_id}`}>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="relative flex-shrink-0">
                   <div className="absolute inset-0 bg-terracotta blur-xl opacity-0 group-hover:opacity-20 transition-opacity"></div>
                   <img
                     src={owner.profile_image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'}
                     alt={owner.full_name}
                     className="relative w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-sm"
                   />
                </div>
                <div className="flex-1 min-w-0 w-full text-center sm:text-left">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                    <h4 className="text-lg font-bold tracking-tight text-charcoal truncate">{owner.full_name}</h4>
                    <span className={`inline-flex px-3 py-1 text-[9px] font-bold tracking-tight uppercase tracking-widest rounded-full ${
                      owner.kyc_status === 'approved' ? 'bg-sage/10 text-sage-dark' : 'bg-amber-100 text-amber-700'
                    }`}>
                      KYC: {owner.kyc_status}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest mb-1">{owner.email}</p>
                  <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest mb-3">{owner.phone}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-[8px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider">City / Location</p>
                      <p className="text-xs font-bold text-charcoal mt-0.5">{owner.city || 'Not Specified'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider">Registration Payment</p>
                      <span className={`inline-block text-[8px] font-bold tracking-tight uppercase tracking-wider px-2 py-0.5 rounded mt-0.5 ${
                        owner.registration_fee_paid ? 'bg-sage/20 text-sage-dark' : 'bg-red-50 text-red-600'
                      }`}>
                        {owner.registration_fee_paid ? 'PAID' : 'UNPAID'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex px-3 py-1 bg-stone text-terracotta text-[9px] font-bold tracking-tight uppercase tracking-widest rounded-full border border-gray-100">
                        {owner.property_count || 0} Assets
                      </span>
                      <button
                        onClick={() => setSelectedOwnerKyc(owner)}
                        className="inline-flex px-3 py-1 border border-terracotta/20 hover:border-terracotta hover:bg-terracotta hover:text-white text-terracotta text-[9px] font-bold tracking-tight uppercase tracking-widest rounded-full transition-all"
                      >
                        Documents
                      </button>
                    </div>
                    <span className="text-[9px] text-charcoal-muted font-bold">
                      📅 Registered: {new Date(owner.created_at || owner.timestamp || Date.now()).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
          <Users className="w-16 h-16 text-sand-200 mx-auto mb-6" />
          <h4 className="text-xl font-bold tracking-tight text-charcoal mb-2">No Owners Assigned</h4>
          <p className="text-charcoal-muted font-bold text-xs uppercase tracking-widest">You haven't been assigned any property owners yet.</p>
        </div>
      )}

      {selectedOwnerKyc && (
        <OwnerVerificationModal
          owner={selectedOwnerKyc}
          onClose={() => setSelectedOwnerKyc(null)}
          onSubmitted={() => {
            setSelectedOwnerKyc(null);
            fetchOwners();
          }}
        />
      )}
    </div>
  );
};


// Properties Section
const PropertiesSection = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await apiClient.get('/broker/properties');
      setProperties(response.data.properties || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="properties-section" className="animate-slide-up">
      <div className="flex items-center mb-8">
         <h3 className="text-2xl font-bold tracking-tight text-charcoal tracking-tight">Property Inventory</h3>
         <div className="ml-4 h-px flex-1 bg-sand-200"></div>
      </div>

      {loading ? (
        <div className="space-y-4">
           {[1,2,3].map(i => <div key={i} className="h-32 bg-white rounded-3xl animate-pulse"></div>)}
        </div>
      ) : properties.length > 0 ? (
        <div data-testid="properties-list">
          <div className="space-y-4">
            {[...properties]
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((property) => (
              <div key={property.property_id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-premium group hover:border-terracotta transition-all duration-300" data-testid={`property-${property.property_id}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:space-x-6 w-full">
                    <div className="relative overflow-hidden w-24 h-24 rounded-2xl shrink-0">
                      <img
                        src={getImageUrl(property.images[0]) || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded'}
                        alt={property.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-charcoal/10"></div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold tracking-tight text-charcoal mb-1">{property.title}</h4>
                      <p className="text-[10px] text-charcoal-muted font-mono mb-1">Property ID: {property.property_id}</p>
                      <div className="flex items-center space-x-3 text-charcoal-muted mb-3">
                         <MapPin className="w-3 h-3" />
                         <span className="text-[10px] font-bold uppercase tracking-widest">{property.city} · {formatCategoryLabel(property.category)}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                         <span className="text-lg font-bold tracking-tight text-terracotta tracking-tight">₹{property.price_per_night} <span className="text-[10px] text-charcoal-muted uppercase">
                           {property.category === 'commercial' || property.category === 'event_venue'
                             ? (property.pricing_cycle === 'hourly' ? '/hr' : property.pricing_cycle === 'weekly' ? '/week' : property.pricing_cycle === 'monthly' ? '/month' : '/day')
                             : '/night'}
                         </span></span>
                         <span className={`px-3 py-1 rounded-full text-[9px] font-bold tracking-tight uppercase tracking-widest ${
                           property.status === 'live' ? 'bg-sage/10 text-sage-dark' :
                           property.status === 'pending_verification' ? 'bg-amber-100 text-amber-700' :
                           'bg-gray-50 text-charcoal-muted'
                         }`}>
                           {property.status.replace('_', ' ')}
                         </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedProperty(property)}
                    className="px-6 py-3 bg-charcoal text-white rounded-xl text-[10px] font-bold tracking-tight uppercase tracking-widest hover:bg-terracotta transition-all shadow-premium"
                  >
                     View Details
                  </button>
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
              <span className="text-xs font-bold tracking-tight text-charcoal uppercase tracking-widest">
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
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
          <Building2 className="w-16 h-16 text-sand-200 mx-auto mb-6" />
          <h4 className="text-xl font-bold tracking-tight text-charcoal mb-2">No Properties Registered</h4>
          <p className="text-charcoal-muted font-bold text-xs uppercase tracking-widest">Global inventory is currently empty.</p>
        </div>
      )}

      {selectedProperty && (
        <PropertyDetailsModal 
          property={selectedProperty} 
          onClose={() => setSelectedProperty(null)} 
        />
      )}
    </div>
  );
};

// Verifications Section — broker physical-visit queue + submission form
const VerificationsSection = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await verificationAPI.listBrokerTasks();
      setTasks(res.data.verifications || []);
    } catch (e) {
      console.error('Error fetching verification tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="verifications-section" className="animate-slide-up">
      <div className="flex items-center mb-8">
         <h3 className="text-2xl font-bold tracking-tight text-charcoal tracking-tight">Inspection Queue</h3>
         <div className="ml-4 h-px flex-1 bg-sand-200"></div>
      </div>

      {loading ? (
        <div className="space-y-4">
           {[1,2].map(i => <div key={i} className="h-40 bg-white rounded-3xl animate-pulse"></div>)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200" data-testid="verifications-empty">
          <FileCheck className="w-16 h-16 text-sand-200 mx-auto mb-6" />
          <h4 className="text-xl font-bold tracking-tight text-charcoal mb-2">Queue Clear</h4>
          <p className="text-charcoal-muted font-bold text-xs uppercase tracking-widest">No pending physical site inspections assigned.</p>
        </div>
      ) : (
        <div data-testid="verifications-list">
          <div className="space-y-6">
            {[...tasks]
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((task) => {
              const pd = task.property_details || {};
              const isOpen = task.status === 'pending' || task.status === 'in_progress' || task.status === 'rejected' || (task.rm_reviewed && !task.rm_approved);
              return (
                <div
                  key={task.verification_id}
                  className="bg-white rounded-2xl p-8 border border-gray-100 shadow-premium hover:border-terracotta transition-all duration-300 group"
                  data-testid={`verification-task-${task.property_id}`}
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:space-x-6 w-full">
                      <div className="relative overflow-hidden w-24 h-24 rounded-2xl shadow-sm shrink-0">
                        <img
                          src={getImageUrl(pd.images?.[0]) || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded'}
                          alt={pd.title}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-charcoal/10"></div>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold tracking-tight text-charcoal mb-1">{pd.title || 'Property'}</h4>
                        <p className="text-[10px] text-charcoal-muted font-mono mb-1">Property ID: {task.property_id}</p>
                        <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest mb-4">
                          {pd.city}{pd.address ? ` · ${pd.address}` : ''}
                        </p>
                        <div className="flex items-center space-x-3">
                          <span
                            className={`px-3 py-1 text-[9px] font-bold tracking-tight uppercase tracking-widest rounded-full ${
                              task.status === 'pending'
                                ? 'bg-amber-100 text-amber-700'
                                : task.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-700'
                                : task.status === 'completed'
                                ? 'bg-sage/10 text-sage-dark'
                                : 'bg-red-100 text-red-700'
                            }`}
                            data-testid={`task-status-${task.property_id}`}
                          >
                            {task.status.replace('_', ' ')}
                          </span>
                          {task.rm_reviewed && (
                            <span
                              className={`px-3 py-1 text-[9px] font-bold tracking-tight uppercase tracking-widest rounded-full ${
                                task.rm_approved
                                  ? 'bg-sage/20 text-sage-dark'
                                  : 'bg-terracotta/20 text-terracotta'
                              }`}
                            >
                              RM {task.rm_approved ? 'APPROVED' : 'REJECTED'}
                            </span>
                          )}
                        </div>
                        {task.broker_remarks && (
                          <p className="text-[10px] text-charcoal-muted mt-4 italic font-bold">
                            REMARKS: "{task.broker_remarks}"
                          </p>
                        )}
                      </div>
                    </div>
                    {isOpen && (
                      <button
                        onClick={() => setActiveTask(task)}
                        className="btn-premium px-8 py-4 shadow-premium whitespace-nowrap"
                        data-testid={`open-submit-${task.property_id}`}
                      >
                        <Camera className="w-5 h-5 mr-3" />
                        <span>{task.status === 'rejected' || (task.rm_reviewed && !task.rm_approved) ? 'RE-VERIFY' : 'SUBMIT VISIT'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {tasks.length > itemsPerPage && (
            <div className="mt-8 flex justify-center items-center space-x-4">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-charcoal hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-bold tracking-tight text-charcoal uppercase tracking-widest">
                Page {currentPage} of {Math.ceil(tasks.length / itemsPerPage)}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(tasks.length / itemsPerPage), p + 1))}
                disabled={currentPage === Math.ceil(tasks.length / itemsPerPage)}
                className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-charcoal hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}

      {activeTask && (
        <SubmitVerificationModal
          task={activeTask}
          onClose={() => setActiveTask(null)}
          onSubmitted={() => {
            setActiveTask(null);
            fetchTasks();
          }}
        />
      )}
    </div>
  );
};

// Modal: broker fills checklist + photos and submits site visit
const SubmitVerificationModal = ({ task, onClose, onSubmitted }) => {
  const checklistLabels = {
    property_owner_verification: 'Property Owner Verification',
    ownership_verification: 'Ownership Verification',
    property_location_verification: 'Property Location Verification',
    amenities_verification: 'Amenities Verification',
    safety_security_verification: 'Safety & Security Verification',
    property_photos_verification: 'Property Photos Verification',
    pricing_verification: 'Pricing Verification',
    guest_capacity_rules: 'Guest Capacity & Rules',
    legal_compliance_verification: 'Legal & Compliance Verification',
    employee_verification_declaration: 'Employee Verification Declaration',
  };
  const initialChecklist = {
    property_owner_verification: false,
    ownership_verification: false,
    property_location_verification: false,
    amenities_verification: false,
    safety_security_verification: false,
    property_photos_verification: false,
    pricing_verification: false,
    guest_capacity_rules: false,
    legal_compliance_verification: false,
    employee_verification_declaration: false,
  };
  const [checklist, setChecklist] = useState(initialChecklist);
  const [checklistReasons, setChecklistReasons] = useState({
    property_owner_verification: '',
    ownership_verification: '',
    property_location_verification: '',
    amenities_verification: '',
    safety_security_verification: '',
    property_photos_verification: '',
    pricing_verification: '',
    guest_capacity_rules: '',
    legal_compliance_verification: '',
    employee_verification_declaration: '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoLat, setPhotoLat] = useState('');
  const [photoLng, setPhotoLng] = useState('');
  const [photos, setPhotos] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const startCamera = async () => {
    setError('');
    tryFillCoordinates();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Camera access denied or unavailable", err);
      setError("Could not access camera. Please allow permissions or use 'Choose File'.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    setCameraStream(null);
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setPhotoFile(file);
        tryFillCoordinates();
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  };

  const toggle = (k) => setChecklist({ ...checklist, [k]: !checklist[k] });
  const updateReason = (k, v) => setChecklistReasons({ ...checklistReasons, [k]: v });

  const fetchIPLocation = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data && data.latitude && data.longitude) {
        setPhotoLat(data.latitude.toFixed(6));
        setPhotoLng(data.longitude.toFixed(6));
      }
    } catch (e) {
      console.warn('IP Location fallback failed', e);
    }
  };

  // Try to auto-prefill lat/lng from the browser's geolocation so brokers
  // don't have to type coordinates manually. Best-effort — silent if denied.
  function tryFillCoordinates() {
    if (!navigator.geolocation) {
      fetchIPLocation();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPhotoLat(pos.coords.latitude.toFixed(6));
        setPhotoLng(pos.coords.longitude.toFixed(6));
      },
      (err) => { 
        console.warn('Geolocation error:', err);
        fetchIPLocation();
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
    );
  };

  const onPhotoFileChange = (e) => {
    const f = e.target.files?.[0];
    setError('');
    if (f) tryFillCoordinates();
    setPhotoFile(f || null);
  };

  const addPhoto = async () => {
    setError('');
    if (!photoFile) {
      setError('Please choose a photo to upload');
      return;
    }
    const lat = parseFloat(photoLat) || 0.0;
    const lng = parseFloat(photoLng) || 0.0;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', photoFile);
      const res = await apiClient.post('/upload/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.url;
      if (!url) {
        setError('Upload succeeded but server returned no URL');
        return;
      }
      setPhotos([
        ...photos,
        {
          photo_url: url,
          latitude: lat,
          longitude: lng,
          timestamp: new Date().toISOString(),
        },
      ]);
      setPhotoFile(null);
      setPhotoLat('');
      setPhotoLng('');
      // Reset the file input so the same file can be picked again if needed
      const input = document.querySelector('[data-testid="photo-file-input"]');
      if (input) input.value = '';
    } catch (e) {
      setError(e?.response?.data?.detail || 'Photo upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (idx) =>
    setPhotos(photos.filter((_, i) => i !== idx));

  const submit = async () => {
    setError('');
    
    // Auto-add the currently selected photo if the list is empty but a file is picked
    let finalPhotos = [...photos];
    if (finalPhotos.length === 0 && photoFile) {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', photoFile);
        const res = await apiClient.post('/upload/image', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const url = res.data?.url;
        if (url) {
          const newPhoto = {
            photo_url: url,
            latitude: parseFloat(photoLat) || 0.0,
            longitude: parseFloat(photoLng) || 0.0,
            timestamp: new Date().toISOString(),
          };
          finalPhotos = [newPhoto];
          setPhotos(finalPhotos);
        }
      } catch (e) {
        setError('Auto-upload failed. Please click "+ Add photo" manually.');
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    if (finalPhotos.length === 0) {
      setError('Add One geo-tagged photo');
      return;
    }

    // Validate that unchecked items have a reason
    let missingReason = false;
    let appendedRemarks = '';
    for (const key of Object.keys(checklist)) {
      if (!checklist[key]) {
        if (!checklistReasons[key].trim()) {
          missingReason = true;
          break;
        }
        appendedRemarks += `\n- ${checklistLabels[key] || key.replaceAll('_', ' ')}: ${checklistReasons[key].trim()}`;
      }
    }

    if (missingReason) {
      setError('Please provide a reason for all unchecked checklist items.');
      return;
    }

    const finalRemarks = remarks.trim() ? `${remarks}\n\nUnchecked Items Reasons:${appendedRemarks}` : `Unchecked Items Reasons:${appendedRemarks}`;

    setSubmitting(true);
    try {
      await verificationAPI.submitVisit(task.property_id, {
        checklist,
        geo_tagged_photos: finalPhotos,
        video_url: videoUrl || null,
        broker_remarks: finalRemarks || null,
      });
      alert('Verification submitted. RM will review remotely.');
      onSubmitted();
    } catch (e) {
      console.error('submit verification failed', e);
      setError(e?.response?.data?.detail || 'Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
      data-testid="submit-verification-modal"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-charcoal">
              Submit Visit — {task.property_details?.title || 'Property'}
            </h3>
            <p className="text-xs text-charcoal-light font-mono mt-1">Property ID: {task.property_id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-charcoal-light hover:text-charcoal"
            data-testid="modal-close"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Property Details & Images */}
          <div className="border border-gray-100 rounded-2xl p-4 bg-stone/50">
            <h4 className="font-bold text-charcoal mb-3">Property Details</h4>
            
            {/* Property Images Gallery */}
            {task.property_details?.images && task.property_details.images.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-2">Property Images</p>
                <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-sand-300">
                  {task.property_details.images.map((img, idx) => (
                    <img 
                      key={idx}
                      src={getImageUrl(img)} 
                      alt={`Property Image ${idx + 1}`} 
                      className="w-32 h-24 object-cover rounded-xl border border-gray-100 shadow-sm flex-shrink-0"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Listing Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <span className="text-[9px] font-bold text-charcoal-muted uppercase block">Category</span>
                <span className="font-bold text-charcoal text-xs">{formatCategoryLabel(task.property_details?.category) || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-charcoal-muted uppercase block">BHK Type</span>
                <span className="font-bold text-charcoal text-xs">{formatDisplayLabel(task.property_details?.bhk_type) || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-charcoal-muted uppercase block">Price per Night</span>
                <span className="font-bold text-terracotta text-xs">₹{task.property_details?.price_per_night || 0}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-charcoal-muted uppercase block">Location</span>
                <span className="font-bold text-charcoal text-xs">{task.property_details?.city || 'N/A'}, {task.property_details?.state || ''}</span>
              </div>
            </div>

            {task.property_details?.address && (
              <div className="mb-3">
                <span className="text-[9px] font-bold text-charcoal-muted uppercase block">Full Address</span>
                <span className="text-xs font-semibold text-charcoal-light">{task.property_details.address}</span>
              </div>
            )}

            {task.property_details?.description && (
              <div className="mb-3">
                <span className="text-[9px] font-bold text-charcoal-muted uppercase block">Description</span>
                <p className="text-xs text-charcoal-light leading-relaxed whitespace-pre-wrap">{formatReadableText(task.property_details.description)}</p>
              </div>
            )}

            {task.property_details?.amenities && task.property_details.amenities.length > 0 && (
              <div>
                <span className="text-[9px] font-bold text-charcoal-muted uppercase block mb-1">Amenities</span>
                <div className="flex flex-wrap gap-1">
                  {task.property_details.amenities.map((amenity, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-sand-200/50 text-charcoal text-[9px] font-semibold rounded">
                      {formatDisplayLabel(amenity)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Checklist */}
          <div>
            <h4 className="font-bold text-charcoal mb-3">Inspection Checklist</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="checklist">
              {Object.entries(checklist).map(([key, val]) => (
                <div key={key} className={`flex flex-col p-3 rounded-xl border-2 transition-colors ${val ? 'bg-green-50 border-green-200' : 'bg-stone border-gray-100 hover:border-gray-200'}`}>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={() => toggle(key)}
                      className="w-5 h-5 text-terracotta border-gray-200 rounded focus:ring-terracotta cursor-pointer"
                      data-testid={`check-${key}`}
                    />
                    <span className={`text-sm font-bold capitalize ${val ? 'text-green-800' : 'text-charcoal'}`}>
                      {checklistLabels[key] || formatDisplayLabel(key)}
                    </span>
                  </label>
                  {!val && (
                    <div className="mt-3">
                      <input
                        type="text"
                        placeholder="Reason for not checking..."
                        value={checklistReasons[key]}
                        onChange={(e) => updateReason(key, e.target.value)}
                        className="w-full text-xs py-2 px-3 border border-red-200 bg-red-50 focus:bg-white focus:border-red-400 focus:ring-1 focus:ring-red-400 rounded outline-none transition-colors"
                        required
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div>
            <h4 className="font-bold text-charcoal mb-3">Geo-tagged Photos</h4>
            <div className="space-y-3 mb-2">
              <div>
                <label className="block text-xs font-semibold text-charcoal-muted mb-1">
                  Photo <span className="text-terracotta ml-2 font-bold tracking-tight uppercase tracking-widest text-[9px]">(Add One geo-tagged photo)</span>
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex-1 text-center py-3 px-4 rounded-xl border-2 border-gray-100 text-sm font-bold text-charcoal hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={onPhotoFileChange}
                      disabled={uploading || submitting}
                      className="hidden"
                      data-testid="photo-file-input"
                    />
                    Choose File
                  </label>
                  <button 
                    onClick={startCamera} 
                    type="button"
                    disabled={uploading || submitting || isCameraOpen}
                    className="flex-1 text-center py-3 px-4 rounded-xl bg-terracotta text-white text-sm font-bold hover:bg-terracotta-dark cursor-pointer transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Open Camera</span>
                  </button>
                </div>
                
                {isCameraOpen && (
                  <div className="mt-4 p-4 bg-charcoal rounded-xl flex flex-col items-center">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full max-h-[60vh] object-contain rounded-lg bg-black"
                    ></video>
                    <div className="flex space-x-4 mt-4 w-full">
                      <button 
                        type="button"
                        onClick={stopCamera}
                        className="flex-1 py-3 bg-gray-50 text-charcoal font-bold rounded-lg hover:bg-sand-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        type="button"
                        onClick={capturePhoto}
                        className="flex-1 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
                      >
                        <Camera className="w-5 h-5" />
                        <span>Capture</span>
                      </button>
                    </div>
                  </div>
                )}

                {photoFile && !isCameraOpen && (
                  <p className="text-xs text-charcoal-muted mt-1" data-testid="photo-file-name">
                    Selected: {photoFile.name} ({Math.round(photoFile.size / 1024)} KB)
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Latitude"
                  value={photoLat}
                  onChange={(e) => setPhotoLat(e.target.value)}
                  className="input-field"
                  data-testid="photo-lat-input"
                />
                <input
                  type="text"
                  placeholder="Longitude"
                  value={photoLng}
                  onChange={(e) => setPhotoLng(e.target.value)}
                  className="input-field"
                  data-testid="photo-lng-input"
                />
              </div>
              <p className="text-xs text-charcoal-light">
                Tip: allow location access when prompted — we auto-fill coordinates from your device GPS.
              </p>
            </div>
            <button
              onClick={addPhoto}
              disabled={uploading || submitting}
              className="mt-4 flex items-center justify-center px-6 py-3 bg-terracotta/10 text-terracotta border-2 border-terracotta/20 rounded-xl text-xs font-bold tracking-tight uppercase tracking-widest hover:bg-terracotta hover:text-white transition-all disabled:opacity-50"
              data-testid="add-photo-btn"
            >
              {uploading ? 'UPLOADING...' : '+ Add photo to list'}
            </button>

            {photos.length > 0 && (
              <ul className="mt-3 space-y-2" data-testid="photos-list">
                {photos.map((p, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between bg-stone px-3 py-2 rounded text-sm"
                    data-testid={`photo-item-${idx}`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <img
                        src={p.photo_url}
                        alt={`Geo-tagged ${idx + 1}`}
                        className="w-12 h-12 rounded object-cover flex-shrink-0 border border-gray-100"
                      />
                      <span className="text-xs text-charcoal-muted truncate">
                        ({p.latitude.toFixed(4)}, {p.longitude.toFixed(4)})
                      </span>
                    </div>
                    <button
                      onClick={() => removePhoto(idx)}
                      className="text-red-600 hover:underline"
                      data-testid={`remove-photo-${idx}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Video + remarks */}
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1">
              Video walkthrough URL (If Applicable)
            </label>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="input-field"
              data-testid="video-url-input"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1">
              Broker remarks (If Applicable)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="input-field"
              data-testid="remarks-input"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" data-testid="modal-error">
              {error}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-charcoal hover:bg-stone"
            data-testid="modal-cancel"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-terracotta text-white hover:bg-terracotta-dark font-semibold disabled:opacity-60"
            data-testid="modal-submit"
          >
            {submitting ? 'Submitting...' : 'Submit Verification'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Leads Section
const LeadsSection = () => {
  const [leads, setLeads] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    city: '',
    property_type: 'residential',
    from_date: '',
    to_date: '',
    property_id: '',
    property_title: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeads();
    fetchProperties();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await apiClient.get('/broker/leads');
      setLeads(response.data.leads || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await apiClient.get('/broker/properties');
      setProperties(response.data.properties || []);
    } catch (error) {
      console.error('Error fetching properties for lead form:', error);
    }
  };

  const handlePropertyChange = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      setFormData(prev => ({ ...prev, property_id: '', property_title: '' }));
      return;
    }
    const selectedProp = properties.find(p => p.property_id === selectedId);
    setFormData(prev => ({
      ...prev,
      property_id: selectedId,
      property_title: selectedProp ? selectedProp.title : ''
    }));
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiClient.post('/broker/leads', {
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email || null,
        city: formData.city,
        property_type: formData.property_type,
        from_date: formData.from_date || null,
        to_date: formData.to_date || null,
        property_id: formData.property_id || null,
        property_title: formData.property_title || null,
        notes: formData.notes || null
      });
      setFormData({
        full_name: '',
        phone: '',
        email: '',
        city: '',
        property_type: 'residential',
        from_date: '',
        to_date: '',
        property_id: '',
        property_title: '',
        notes: ''
      });
      setShowAddForm(false);
      fetchLeads();
      alert('Lead added successfully!');
    } catch (err) {
      console.error('Error creating lead:', err);
      setError(err?.response?.data?.detail || 'Failed to create lead. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="leads-section" className="animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center flex-1">
           <h3 className="text-2xl font-bold tracking-tight text-charcoal tracking-tight">Lead Pipeline</h3>
           <div className="ml-4 h-px flex-1 bg-sand-200"></div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-premium px-8 py-4 shadow-premium"
          data-testid="add-lead-btn"
        >
          <Plus className="w-5 h-5 mr-3" />
          <span>{showAddForm ? 'Close Portal' : 'Add Lead'}</span>
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-premium mb-12 animate-slide-down" data-testid="add-lead-form">
          <h4 className="text-xl font-bold tracking-tight text-charcoal tracking-tight mb-6">Add New Lead</h4>
          <form onSubmit={handleCreateLead} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="input-field w-full"
                  data-testid="lead-name-input"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-2">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +91 9876543210"
                  className="input-field w-full"
                  data-testid="lead-phone-input"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-2">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. ramesh@example.com"
                  className="input-field w-full"
                  data-testid="lead-email-input"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-2">City *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. Mumbai"
                  className="input-field w-full"
                  data-testid="lead-city-input"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-2">Property Type *</label>
                <select
                  value={formData.property_type}
                  onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                  className="input-field w-full"
                  data-testid="lead-property-type"
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="event_venue">Event Venue</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-2">From Date</label>
                <input
                  type="date"
                  value={formData.from_date}
                  onChange={(e) => setFormData({ ...formData, from_date: e.target.value })}
                  className="input-field w-full text-charcoal"
                  data-testid="lead-from-date-input"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-2">To Date</label>
                <input
                  type="date"
                  value={formData.to_date}
                  onChange={(e) => setFormData({ ...formData, to_date: e.target.value })}
                  className="input-field w-full text-charcoal"
                  data-testid="lead-to-date-input"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-2">Selected Property</label>
                <select
                  value={formData.property_id}
                  onChange={handlePropertyChange}
                  className="input-field w-full"
                  data-testid="lead-property-select"
                >
                  <option value="">No Specific Property / General Lead</option>
                  {properties.map(p => (
                    <option key={p.property_id} value={p.property_id}>
                      {p.title} ({p.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-2">Lead Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any specific details, budget, or preferences..."
                rows={3}
                className="input-field w-full"
                data-testid="lead-notes-input"
              />
            </div>

            {error && (
              <p className="text-xs font-bold text-red-600 uppercase tracking-wider" data-testid="lead-form-error">{error}</p>
            )}

            <div className="flex justify-end space-x-4 pt-4 border-t border-sand-100">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setError('');
                }}
                className="px-6 py-3 border border-gray-200 text-charcoal rounded-xl text-[10px] font-bold tracking-tight uppercase tracking-widest hover:bg-stone transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-premium px-8 py-3 shadow-premium"
                data-testid="lead-form-submit"
              >
                {submitting ? 'Adding...' : 'Add Lead'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
           {[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-3xl animate-pulse"></div>)}
        </div>
      ) : leads.length > 0 ? (
        <div className="grid grid-cols-1 gap-4" data-testid="leads-list">
          {leads.map((lead) => (
            <div key={lead.lead_id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-premium hover:border-terracotta transition-all duration-300 group" data-testid={`lead-${lead.lead_id}`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center space-x-6">
                   <div className="w-12 h-12 rounded-xl bg-stone flex items-center justify-center text-terracotta group-hover:bg-terracotta group-hover:text-white transition-all">
                      <Target className="w-6 h-6" />
                   </div>
                   <div>
                      <h4 className="text-lg font-bold tracking-tight text-charcoal mb-0.5">{lead.full_name}</h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                         <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest">{lead.phone} · {lead.email}</p>
                         <div className="flex items-center space-x-2 text-[10px] font-bold text-terracotta">
                            <MapPin className="w-3 h-3" />
                            <span className="uppercase tracking-widest">{lead.city} · {formatPropertyTypeLabel(lead.property_type)}</span>
                         </div>
                         {lead.from_date && lead.to_date && (
                            <div className="flex items-center space-x-1 text-[9px] font-bold tracking-tight text-sage-dark bg-sage/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
                               <span>📅 {(() => {
                                  const fDate = new Date(lead.from_date);
                                  const tDate = new Date(lead.to_date);
                                  if (!isNaN(fDate) && !isNaN(tDate)) {
                                     return `${fDate.toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'})} - ${tDate.toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'})}`;
                                  }
                                  return `${lead.from_date} to ${lead.to_date}`;
                               })()}</span>
                            </div>
                         )}
                         {lead.property_title && (
                            <div className="flex items-center space-x-1 text-[9px] font-bold tracking-tight text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-widest border border-amber-100">
                               <span>🏠 {lead.property_title}</span>
                            </div>
                         )}
                      </div>
                   </div>
                </div>
                <div className="flex items-center space-x-4">
                   <span className={`px-4 py-2 text-[9px] font-bold tracking-tight uppercase tracking-[0.1em] rounded-full ${
                     lead.status === 'converted' ? 'bg-sage/10 text-sage-dark' :
                     lead.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                     lead.status === 'lost' ? 'bg-red-50 text-terracotta' :
                     'bg-amber-100 text-amber-700'
                   }`}>
                     {lead.status}
                   </span>
                   <ChevronRight className="w-4 h-4 text-sand-300 group-hover:text-charcoal transition-all" />
                </div>
              </div>
              {lead.notes && (
                <div className="mt-4 pt-4 border-t border-sand-100">
                   <p className="text-[10px] text-charcoal-muted font-bold italic leading-relaxed">"{lead.notes}"</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
          <Target className="w-16 h-16 text-sand-200 mx-auto mb-6" />
          <h4 className="text-xl font-bold tracking-tight text-charcoal mb-2">No Active Leads</h4>
          <p className="text-charcoal-muted font-bold text-xs uppercase tracking-widest mb-8">Start your outreach to populate your pipeline.</p>
          <button onClick={() => setShowAddForm(true)} className="btn-premium px-10 py-4 shadow-premium">
            Generate First Lead
          </button>
        </div>
      )}
    </div>
  );
};

// Commissions Section
const CommissionsSection = () => {
  const [commissions, setCommissions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    try {
      const response = await apiClient.get('/broker/commissions');
      setCommissions(response.data.commissions || []);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching commissions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="commissions-section" className="animate-slide-up">
      <div className="flex items-center mb-10">
         <h3 className="text-2xl font-bold tracking-tight text-charcoal tracking-tight">Financial Performance</h3>
         <div className="ml-4 h-px flex-1 bg-sand-200"></div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-premium">
            <div className="w-12 h-12 bg-sage/10 rounded-2xl flex items-center justify-center mb-6">
               <IndianRupee className="w-6 h-6 text-sage-dark" />
            </div>
            <p className="text-3xl font-bold tracking-tight text-charcoal tracking-tighter mb-1">₹{(summary.total_earned / 100).toLocaleString('en-IN')}</p>
            <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-[0.2em]">Total Revenue</p>
          </div>
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-premium">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
               <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-3xl font-bold tracking-tight text-charcoal tracking-tighter mb-1">₹{(summary.paid / 100).toLocaleString('en-IN')}</p>
            <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-[0.2em]">Settled</p>
          </div>
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-premium">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-6">
               <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <p className="text-3xl font-bold tracking-tight text-charcoal tracking-tighter mb-1">₹{(summary.pending / 100).toLocaleString('en-IN')}</p>
            <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-[0.2em]">Pending Settlement</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
           {[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-3xl animate-pulse"></div>)}
        </div>
      ) : commissions.length > 0 ? (
        <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-premium" data-testid="commissions-list">
           <table className="w-full text-left border-collapse">
              <thead>
                 <tr className="bg-stone border-b border-gray-100">
                    <th className="px-8 py-5 text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">Transaction ID</th>
                    <th className="px-8 py-5 text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">Yield</th>
                    <th className="px-8 py-5 text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest text-right">Status</th>
                 </tr>
              </thead>
              <tbody>
                 {commissions.map((commission) => (
                    <tr key={commission.commission_id} className="border-b border-sand-100 hover:bg-stone/50 transition-colors">
                       <td className="px-8 py-6">
                          <p className="text-sm font-bold tracking-tight text-charcoal mb-0.5">{commission.booking_id}</p>
                          <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">Source: {commission.booking_source}</p>
                       </td>
                       <td className="px-8 py-6">
                          <p className="text-sm font-bold tracking-tight text-terracotta mb-0.5">₹{(commission.commission_amount / 100).toFixed(2)}</p>
                          <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">{commission.commission_percentage}% of ₹{(commission.booking_amount / 100).toFixed(2)}</p>
                       </td>
                       <td className="px-8 py-6 text-right">
                          <span className={`inline-flex px-4 py-1.5 text-[9px] font-bold tracking-tight uppercase tracking-widest rounded-full ${
                             commission.payment_status === 'paid' ? 'bg-sage/10 text-sage-dark' : 'bg-amber-100 text-amber-700'
                          }`}>
                             {commission.payment_status}
                          </span>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
          <IndianRupee className="w-16 h-16 text-sand-200 mx-auto mb-6" />
          <h4 className="text-xl font-bold tracking-tight text-charcoal mb-2">No Commissions Yet</h4>
          <p className="text-charcoal-muted font-bold text-xs uppercase tracking-widest">Earnings will appear here as bookings are finalized.</p>
        </div>
      )}
    </div>
  );
};

const PropertyDetailsModal = ({ property, onClose }) => {
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  if (!property) return null;

  // Format images
  const propertyImages = (property.images || []).map(img => img.split('#')[0]);

  // Parse house rules if JSON (for event venues) or show as text
  let venueRules = null;
  let textRules = property.house_rules || '';
  if (property.house_rules && property.house_rules.trim().startsWith('{')) {
    try {
      venueRules = JSON.parse(property.house_rules);
    } catch (e) {
      console.error(e);
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-elevated animate-in zoom-in-95 duration-200">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 px-8 py-5 flex items-center justify-between z-10">
          <div>
            <span className="text-[9px] font-bold tracking-tight text-terracotta bg-terracotta/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {formatCategoryLabel(property.category)} · {formatPropertyTypeLabel(property.property_type)}
            </span>
            <h3 className="text-xl font-bold tracking-tight text-charcoal mt-2 tracking-tight">
              {property.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-charcoal-light hover:text-charcoal transition-colors p-1"
          >
            <XCircle className="w-7 h-7" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Photo Gallery */}
          {propertyImages.length > 0 && (
            <div className="space-y-3">
              <div className="relative h-96 w-full rounded-2xl overflow-hidden bg-gray-50">
                <img
                  src={getImageUrl(propertyImages[activeImageIdx])}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {propertyImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {propertyImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIdx(idx)}
                      className={`relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                        activeImageIdx === idx ? 'border-terracotta scale-95 shadow-subtle' : 'border-transparent hover:border-gray-200'
                      }`}
                    >
                      <img
                        src={getImageUrl(img)}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Description & Overview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left/Middle Column - Details */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h4 className="text-xs font-bold tracking-tight uppercase text-charcoal-muted tracking-wider mb-2">Description</h4>
                <p className="text-sm text-charcoal-muted leading-relaxed whitespace-pre-line">
                  {formatReadableText(property.description)}
                </p>
              </div>

              {/* Specifications */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-stone rounded-2xl border border-gray-100">
                <div>
                  <span className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider block">BHK / Size</span>
                  <span className="text-sm font-bold tracking-tight text-charcoal mt-1 block">{formatDisplayLabel(property.bhk_type) || '—'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider block">Area (sq.ft)</span>
                  <span className="text-sm font-bold tracking-tight text-charcoal mt-1 block">{property.area_sqft ? `${property.area_sqft} sqft` : '—'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider block">Pricing Mode</span>
                  <span className="text-sm font-bold tracking-tight text-charcoal mt-1 block">{formatDisplayLabel(property.pricing_cycle || 'day')}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider block">Min Stay</span>
                  <span className="text-sm font-bold tracking-tight text-charcoal mt-1 block">{property.minimum_stay_days || 1} {property.pricing_cycle === 'hourly' ? 'hours' : 'days'}</span>
                </div>
              </div>

              {/* Location Detail */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold tracking-tight uppercase text-charcoal-muted tracking-wider">Location Info</h4>
                <div className="p-5 bg-white border border-gray-100 rounded-2xl space-y-3">
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-5 h-5 text-terracotta mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-charcoal">{property.address}</p>
                      <p className="text-xs text-charcoal-muted">{property.city}, {property.state} - {property.pin_code}</p>
                    </div>
                  </div>
                  {(property.latitude || property.longitude) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-charcoal-muted pt-2 border-t border-sand-100">
                      <span><strong>Lat:</strong> {property.latitude}</span>
                      <span><strong>Lng:</strong> {property.longitude}</span>
                      {property.google_maps_url && (
                        <a
                          href={property.google_maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-terracotta font-bold hover:underline ml-auto flex items-center gap-1"
                        >
                          View on Google Maps ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Amenities */}
              <div>
                <h4 className="text-xs font-bold tracking-tight uppercase text-charcoal-muted tracking-wider mb-3">Amenities</h4>
                <div className="flex flex-wrap gap-2">
                  {property.amenities && property.amenities.length > 0 ? (
                    property.amenities.map((amenity, idx) => (
                      <span
                        key={idx}
                        className="px-3.5 py-1.5 bg-gray-50 text-charcoal text-xs font-bold rounded-full border border-gray-100 capitalize"
                      >
                        {formatDisplayLabel(amenity)}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-charcoal-muted italic">No amenities specified.</span>
                  )}
                </div>
              </div>

              {/* Nearby Places */}
              {property.nearby_places && property.nearby_places.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold tracking-tight uppercase text-charcoal-muted tracking-wider mb-3">Nearby Famous Places</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {property.nearby_places.map((place, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-semibold rounded-full"
                      >
                        📍 {place}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Package Details for Event Venues */}
              {property.category === 'event_venue' && property.packages && property.packages.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold tracking-tight uppercase text-charcoal-muted tracking-wider">
                    Food Package Items
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {property.packages.map((pkg, idx) => {
                      const isVeg = pkg.type === 'veg';
                      const entries = Object.entries(pkg.items || {}).filter(([k, v]) => Number(v) > 0);
                      if (entries.length === 0) return null;
                      
                      return (
                        <div key={idx} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                          <div className={`flex items-center px-5 py-4 ${isVeg ? 'bg-green-50/50' : 'bg-red-50/50'} border-b ${isVeg ? 'border-green-100' : 'border-red-100'}`}>
                            <div className={`w-3 h-3 ${isVeg ? 'bg-green-500' : 'bg-red-500'} ${isVeg ? 'rounded-sm' : 'rounded-full'} mr-3 border ${isVeg ? 'border-green-700' : 'border-red-700'}`}></div>
                            <h3 className={`text-sm font-bold tracking-tight uppercase tracking-widest ${isVeg ? 'text-green-900' : 'text-red-900'}`}>
                              {isVeg ? 'Vegetarian Package' : 'Non-Vegetarian Package'}
                            </h3>
                          </div>
                          <div className="p-5">
                            <ul className="space-y-3">
                              {entries.map(([item, count]) => (
                                <li key={item} className="flex justify-between items-center text-sm">
                                  <span className="text-charcoal-muted font-medium flex items-center">
                                    <CheckCircle className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
                                    {formatDisplayLabel(item)}
                                  </span>
                                  <span className="text-xs font-bold tracking-tight bg-gray-50 text-charcoal px-2 py-0.5 rounded-full">
                                    x{count}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Pricing and Rules */}
            <div className="space-y-6">
              {/* Pricing Box */}
              <div className="bg-charcoal text-white rounded-3xl p-6 shadow-premium relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-terracotta/10 rounded-full translate-x-8 -translate-y-8"></div>
                <span className="text-[10px] font-bold tracking-tight uppercase tracking-widest text-white/50">Pricing & Policy</span>
                
                {property.category === 'event_venue' ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-[10px] font-bold tracking-tight uppercase tracking-wider text-white/60">Venue Rent</p>
                      <p className="text-3xl font-bold tracking-tight text-terracotta tracking-tight">₹{property.price_per_night?.toLocaleString('en-IN')} <span className="text-xs text-white/60">/day</span></p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/10">
                      <div>
                        <p className="text-[9px] font-bold tracking-tight uppercase tracking-wider text-white/60">Veg Plate</p>
                        <p className="text-lg font-bold tracking-tight text-white">₹{property.veg_price || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold tracking-tight uppercase tracking-wider text-white/60">Non-Veg Plate</p>
                        <p className="text-lg font-bold tracking-tight text-white">₹{property.non_veg_price || '—'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <p className="text-[10px] font-bold tracking-tight uppercase tracking-wider text-white/60">Base Price</p>
                    <p className="text-3xl font-bold tracking-tight text-terracotta tracking-tight">
                      ₹{property.price_per_night?.toLocaleString('en-IN')}{' '}
                      <span className="text-xs text-white/60">
                        /{formatDisplayLabel(property.pricing_cycle || 'night')}
                      </span>
                    </p>
                  </div>
                )}
                
                <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60 font-bold uppercase tracking-wider">Instant Booking</span>
                    <span className={`px-2 py-0.5 font-bold tracking-tight uppercase tracking-wider rounded text-[9px] ${property.instant_booking ? 'bg-sage text-white' : 'bg-white/10 text-white/60'}`}>
                      {property.instant_booking ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60 font-bold uppercase tracking-wider">Pet-Friendly</span>
                    <span className={`px-2 py-0.5 font-bold tracking-tight uppercase tracking-wider rounded text-[9px] ${property.pet_friendly ? 'bg-sage text-white' : 'bg-white/10 text-white/60'}`}>
                      {property.pet_friendly ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60 font-bold uppercase tracking-wider">Smoking Allowed</span>
                    <span className={`px-2 py-0.5 font-bold tracking-tight uppercase tracking-wider rounded text-[9px] ${property.smoking_allowed ? 'bg-sage text-white' : 'bg-white/10 text-white/60'}`}>
                      {property.smoking_allowed ? 'YES' : 'NO'}
                    </span>
                  </div>
                </div>
              </div>

              {/* House Rules / Venue Policies */}
              <div className="bg-stone p-6 rounded-3xl border border-gray-100">
                <h4 className="text-xs font-bold tracking-tight uppercase text-charcoal-muted tracking-wider mb-3">
                  {property.category === 'event_venue' ? 'Venue Inclusions / Policies' : 'House Rules'}
                </h4>
                {venueRules ? (
                  <div className="space-y-4 text-xs text-charcoal-muted font-semibold">
                    {/* Timings */}
                    {(venueRules.timings_morning_start || venueRules.timings_afternoon_start || venueRules.timings_evening_start) && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold tracking-tight text-charcoal uppercase tracking-wider block">Operating Hours</span>
                        {venueRules.timings_morning_start && (
                          <p>Morning Slot: {venueRules.timings_morning_start} to {venueRules.timings_morning_end}</p>
                        )}
                        {venueRules.timings_afternoon_start && (
                          <p>Afternoon Slot: {venueRules.timings_afternoon_start} to {venueRules.timings_afternoon_end}</p>
                        )}
                        {venueRules.timings_evening_start && (
                          <p>Evening Slot: {venueRules.timings_evening_start} to {venueRules.timings_evening_end}</p>
                        )}
                      </div>
                    )}
                    {/* Taxes & Rooms */}
                    <div className="grid grid-cols-2 gap-4">
                      {venueRules.taxes && (
                        <div>
                          <span className="text-[10px] font-bold tracking-tight text-charcoal uppercase tracking-wider block">Taxes</span>
                          <p>{venueRules.taxes}%</p>
                        </div>
                      )}
                      {venueRules.rooms_count && (
                        <div>
                          <span className="text-[10px] font-bold tracking-tight text-charcoal uppercase tracking-wider block">Rooms</span>
                          <p>{venueRules.rooms_count} rooms (avg ₹{venueRules.room_price}/room)</p>
                        </div>
                      )}
                    </div>
                    {/* Food & Alcohol */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold tracking-tight text-charcoal uppercase tracking-wider block">Restrictions</span>
                      <p>Food provided by venue: {venueRules.food_venue ? 'Yes' : 'No'}</p>
                      <p>Outside food allowed: {venueRules.food_outside ? 'Yes' : 'No'}</p>
                      <p>Alcohol allowed: {venueRules.alcohol_allowed ? 'Yes' : 'No'}</p>
                      <p>Valet parking: {venueRules.parking_valet ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-charcoal-muted leading-relaxed whitespace-pre-line">
                    {textRules ? formatReadableText(textRules) : 'No rules specified.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Modal: broker uploads owner KYC documents + signatures and submits verification
const OwnerVerificationModal = ({ owner, onClose, onSubmitted }) => {
  const [kycStatus, setKycStatus] = useState('unverified');
  const [kycDocuments, setKycDocuments] = useState([]);
  const [kycRemarks, setKycRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState({});

  // Document states
  const [aadharCard, setAadharCard] = useState('');
  const [propertyProof, setPropertyProof] = useState('');
  const [cancelledCheque, setCancelledCheque] = useState('');
  const [societyNoc, setSocietyNoc] = useState('');
  const [shopAct, setShopAct] = useState('');
  const [gstCertificate, setGstCertificate] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [agreementOwnerName, setAgreementOwnerName] = useState('');
  const [agreementOwnerAddress, setAgreementOwnerAddress] = useState('');
  const [agreementSignature, setAgreementSignature] = useState('');
  const [verificationConsent, setVerificationConsent] = useState(false);

  // Canvas signature
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penWidth] = useState(3);
  const [showAgreementModal, setShowAgreementModal] = useState(false);

  useEffect(() => {
    fetchKycData();
  }, [owner.user_id]);

  const fetchKycData = async () => {
    try {
      const res = await accountAPI.getOwnerKYC(owner.user_id);
      const data = res.data;
      setKycStatus(data.kyc_status);
      setKycDocuments(data.kyc_documents || []);
      setKycRemarks(data.kyc_remarks || '');
      
      const aadhar = data.kyc_documents?.find(d => d.document_type === 'aadhar_card')?.document_url || '';
      const prop = data.kyc_documents?.find(d => d.document_type === 'property_proof')?.document_url || '';
      const cheque = data.kyc_documents?.find(d => d.document_type === 'cancelled_cheque')?.document_url || '';
      const society = data.kyc_documents?.find(d => d.document_type === 'society_noc')?.document_url || '';
      const shopActVal = data.kyc_documents?.find(d => d.document_type === 'shop_act')?.document_url || '';
      const gstCert = data.kyc_documents?.find(d => d.document_type === 'gst_certificate')?.document_url || '';
      const gstNum = data.kyc_documents?.find(d => d.document_type === 'gst_number')?.document_url || '';

      setAadharCard(aadhar);
      setPropertyProof(prop);
      setCancelledCheque(cheque);
      setSocietyNoc(society);
      setShopAct(shopActVal);
      setGstCertificate(gstCert);
      setGstNumber(gstNum);

      setAgreementOwnerName(data.agreement_owner_name || owner.full_name || '');
      setAgreementOwnerAddress(data.agreement_owner_address || '');
      setAgreementSignature(data.agreement_signature || '');
    } catch (e) {
      console.error('Error fetching owner KYC:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDocUpload = async (file, docType) => {
    if (!file) return;
    setUploadingDocs(prev => ({ ...prev, [docType]: true }));
    try {
      const res = await uploadAPI.uploadDocument(file);
      if (docType === 'aadhar') setAadharCard(res.url);
      else if (docType === 'property') setPropertyProof(res.url);
      else if (docType === 'cheque') setCancelledCheque(res.url);
      else if (docType === 'gst') setGstCertificate(res.url);
      else if (docType === 'society') setSocietyNoc(res.url);
      else if (docType === 'shop_act') setShopAct(res.url);

      await accountAPI.saveOwnerDraftDocument(owner.user_id, {
        document_type: docType,
        document_url: res.url
      });
      fetchKycData();
    } catch (err) {
      alert(`Failed to upload ${docType}: ` + (err.response?.data?.detail || err.message));
    } finally {
      setUploadingDocs(prev => ({ ...prev, [docType]: false }));
    }
  };

  const handleRejectedDocRemove = async (docType) => {
    if (!window.confirm('Remove this rejected document and upload a new one?')) return;
    setUploadingDocs(prev => ({ ...prev, [docType]: true }));
    try {
      await accountAPI.deleteOwnerRejectedDraftDocument(owner.user_id, docType);
      if (docType === 'aadhar') setAadharCard('');
      else if (docType === 'property') setPropertyProof('');
      else if (docType === 'cheque') setCancelledCheque('');
      else if (docType === 'gst') setGstCertificate('');
      else if (docType === 'society') setSocietyNoc('');
      else if (docType === 'shop_act') setShopAct('');
      fetchKycData();
    } catch (err) {
      alert('Failed to remove document: ' + (err.response?.data?.detail || err.message));
    } finally {
      setUploadingDocs(prev => ({ ...prev, [docType]: false }));
    }
  };

  const getFileName = (url) => {
    if (!url) return '';
    try {
      const decoded = decodeURIComponent(url);
      const parts = decoded.split('/');
      const filename = parts[parts.length - 1];
      return filename.split('?')[0];
    } catch (e) {
      return 'document_file';
    }
  };

  // Drawing signature
  const startDrawing = (e) => {
    if (e.cancelable) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1F2937';
    
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (clientX === undefined || clientY === undefined) return;
    
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (clientX === undefined || clientY === undefined) return;
    
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSaveSignatureAndAgreement = async () => {
    if (!agreementOwnerName.trim()) {
      alert('Please enter Owner Name');
      return;
    }
    if (!agreementOwnerAddress.trim()) {
      alert('Please enter Owner Address');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
      alert('Please draw signature first');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    try {
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const sigFile = new File([u8arr], 'signature.png', { type: mime });
      
      setUploadingDocs(prev => ({ ...prev, signature: true }));
      const res = await uploadAPI.uploadDocument(sigFile);
      setAgreementSignature(res.url);

      await accountAPI.saveOwnerDraftAgreement(owner.user_id, {
        agreement_owner_name: agreementOwnerName,
        agreement_owner_address: agreementOwnerAddress,
        agreement_signature: res.url
      });
      setShowAgreementModal(false);
      alert('Agreement draft saved successfully');
    } catch (err) {
      alert('Failed to save signature: ' + err.message);
    } finally {
      setUploadingDocs(prev => ({ ...prev, signature: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!aadharCard || !propertyProof || !cancelledCheque || !shopAct || !agreementSignature) {
      alert('Please upload all mandatory documents and sign the agreement.');
      return;
    }
    if (!verificationConsent) {
      alert('Please accept the Terms & Conditions consent.');
      return;
    }

    setSubmitting(true);
    try {
      await accountAPI.submitOwnerVerification(owner.user_id, {
        aadhar_card: aadharCard,
        property_proof: propertyProof,
        cancelled_cheque: cancelledCheque,
        society_noc: societyNoc || null,
        shop_act: shopAct || null,
        gst_certificate: gstCertificate || null,
        gst_number: gstNumber || null,
        agreement_owner_name: agreementOwnerName,
        agreement_owner_address: agreementOwnerAddress,
        agreement_signature: agreementSignature,
        terms_accepted: true,
        terms_version: 'host-verification-2026-06'
      });
      alert('KYC submitted successfully for Admin review!');
      onSubmitted();
    } catch (err) {
      alert('Verification submission failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const getDocStatus = (docType) => {
    const doc = kycDocuments.find(d => d.document_type === docType);
    return doc ? doc.status : null;
  };

  const getDocRejectionReason = (docType) => {
    const doc = kycDocuments.find(d => d.document_type === docType);
    return doc ? doc.rejection_reason : null;
  };

  const renderDocCard = (number, title, description, docType, value, accept, isMandatory, Icon) => {
    const backendDocTypeMap = {
      aadhar: 'aadhar_card',
      property: 'property_proof',
      cheque: 'cancelled_cheque',
      society: 'society_noc',
      shop_act: 'shop_act',
      gst: 'gst_certificate'
    };
    const dbType = backendDocTypeMap[docType];
    const docStatus = getDocStatus(dbType);
    const rejectionReason = getDocRejectionReason(dbType);
    const canReplaceDocument = docStatus === 'rejected' || kycStatus === 'rejected';

    return (
      <div className="bg-white rounded-none border border-sand-200 p-6 shadow-sm flex flex-col justify-between min-h-[18rem] h-auto relative overflow-hidden transition-all duration-300 hover:shadow-premium hover:border-terracotta group">
        <div className="absolute top-0 left-0 bg-terracotta text-white font-black text-[10px] tracking-wider px-3.5 py-1.5 rounded-none shadow-sm">
          {number}
        </div>
        <div className="flex flex-col items-center flex-1 w-full">
          <div className="w-14 h-14 rounded-none bg-sand-50 border border-sand-200 flex items-center justify-center mb-4 group-hover:bg-terracotta/5 transition-colors">
            <Icon className="w-6 h-6 text-terracotta" />
          </div>
          <h4 className="text-sm font-black text-charcoal text-center mb-1">
            {title} {isMandatory && <span className="text-red-500 font-bold ml-1">*</span>}
          </h4>
          <p className="text-[11px] text-charcoal-muted font-bold text-center mb-4 leading-normal max-w-[90%]">{description}</p>
          
          {docType === 'gst' && (
            <div className="w-full mb-3 text-left">
              <label className="text-[8px] font-black text-charcoal-muted uppercase tracking-widest block mb-1">
                GST Number (Optional)
              </label>
              <input
                type="text"
                placeholder="Enter GST Number"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="w-full px-3 py-2 border border-sand-200 rounded-none text-[11px] outline-none focus:border-terracotta font-semibold"
              />
            </div>
          )}

          {value ? (
            <div className="flex flex-col items-center mb-4 space-y-1">
              {docStatus === 'approved' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 border border-green-200 rounded-full text-[9px] font-black uppercase tracking-wider">
                  <Check className="w-3 h-3" />
                  Verified
                </span>
              ) : docStatus === 'rejected' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full text-[9px] font-black uppercase tracking-wider">
                  <AlertCircle className="w-3 h-3" />
                  Rejected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse">
                  <Clock className="w-3 h-3" />
                  Pending
                </span>
              )}
              {docStatus === 'rejected' && rejectionReason && (
                <span className="text-[9px] text-red-600 font-bold max-w-[220px] text-center leading-relaxed" title={rejectionReason}>
                  {rejectionReason}
                </span>
              )}
            </div>
          ) : null}
        </div>

        {value ? (
          <>
            <div className="bg-sand-50/80 border border-sand-200 rounded-none p-3 flex items-center justify-between mt-auto w-full">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="bg-red-50 text-red-500 p-2 rounded-none flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[11px] font-black text-charcoal truncate max-w-[100px] sm:max-w-[120px]" title={getFileName(value)}>
                    {getFileName(value)}
                  </p>
                  <p className="text-[8px] font-bold text-charcoal-muted uppercase tracking-wider">Uploaded File</p>
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                <a
                  href={getImageUrl(value)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 hover:bg-sand-200 rounded-none text-charcoal-muted hover:text-terracotta transition-colors"
                  title="View File"
                >
                  <Eye className="w-4 h-4" />
                </a>
                <label className="p-1.5 hover:bg-sand-200 rounded-none text-charcoal-muted hover:text-terracotta cursor-pointer transition-colors" title="Change File">
                  <Upload className="w-4 h-4" />
                  <input
                    type="file"
                    accept={accept}
                    onChange={(e) => handleDocUpload(e.target.files[0], docType)}
                    className="hidden"
                    disabled={uploadingDocs[docType]}
                  />
                </label>
                {canReplaceDocument && (
                  <button
                    type="button"
                    onClick={() => handleRejectedDocRemove(docType)}
                    disabled={uploadingDocs[docType]}
                    className="p-1.5 hover:bg-red-100 text-red-500 disabled:opacity-50 transition-colors"
                    title="Remove Rejected File"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {canReplaceDocument && (
              <label className="mt-2 w-full inline-flex items-center justify-center gap-2 border border-red-200 bg-red-50 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-red-600 cursor-pointer hover:bg-red-100 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                {uploadingDocs[docType] ? 'Uploading...' : 'Replace Document'}
                <input
                  type="file"
                  accept={accept}
                  onChange={(e) => handleDocUpload(e.target.files[0], docType)}
                  className="hidden"
                  disabled={uploadingDocs[docType]}
                />
              </label>
            )}
          </>
        ) : (
          <label className="w-full border-2 border-dashed border-sand-300 hover:border-terracotta bg-white hover:bg-sand-50/50 rounded-none p-5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[7rem] mt-auto">
            <div className="bg-sand-50 p-2.5 rounded-none mb-2 flex items-center justify-center">
              {uploadingDocs[docType] ? (
                <div className="w-4 h-4 border-2 border-terracotta border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4 text-charcoal-muted" />
              )}
            </div>
            <span className="text-[10px] font-black text-charcoal uppercase tracking-wider text-center">
              {uploadingDocs[docType] ? 'Uploading...' : 'Upload Document'}
            </span>
            <span className="text-[8px] text-charcoal-muted font-bold mt-0.5 text-center">PDF, JPG or PNG (Max. 5MB)</span>
            <input
              type="file"
              accept={accept}
              onChange={(e) => handleDocUpload(e.target.files[0], docType)}
              className="hidden"
              disabled={uploadingDocs[docType]}
            />
          </label>
        )}
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-[9999] flex items-center justify-center p-6">
      <div className="bg-white rounded-[2rem] p-8 max-w-4xl w-full shadow-elevated border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-charcoal">KYC Documents — {owner.full_name}</h3>
            <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest mt-1">Upload files and sign host agreement</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex px-3 py-1 text-[9px] font-bold tracking-tight uppercase tracking-widest rounded-full ${
              kycStatus === 'approved' ? 'bg-sage/10 text-sage-dark' : 'bg-amber-100 text-amber-700'
            }`}>
              KYC Status: {kycStatus}
            </span>
            <button 
              onClick={onClose} 
              className="w-8 h-8 rounded-full bg-stone flex items-center justify-center text-charcoal-muted hover:text-terracotta transition-all"
            >
              <Plus className="w-5 h-5 rotate-45" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 font-bold text-charcoal-muted uppercase text-xs tracking-widest">Loading owner KYC parameters...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {kycRemarks && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-800">
                <span className="font-bold uppercase tracking-wider text-[10px] block mb-1">Verification Rejection reason:</span>
                {kycRemarks}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {renderDocCard("01", "Aadhar Card", "Aadhaar Card of the host / property owner", "aadhar", aadharCard, "image/*,application/pdf", true, User)}
              {renderDocCard("02", "Property Proof", "Index 2 / Light Bill / Tax Receipt", "property", propertyProof, "image/*,application/pdf", true, Building2)}
              {renderDocCard("03", "Cancelled Cheque", "Cancelled cheque for payout verification", "cheque", cancelledCheque, "image/*,application/pdf", true, Landmark)}
              {renderDocCard("04", "Shop Act", "Shop & Establishment Act certificate", "shop_act", shopAct, "image/*,application/pdf", true, Briefcase)}
              {renderDocCard("05", "Society NOC", "Society No Objection Certificate (Optional)", "society", societyNoc, "image/*,application/pdf", false, Building2)}
              {renderDocCard("06", "GST Certificate", "GST registration document (Optional)", "gst", gstCertificate, "image/*,application/pdf", false, FileText)}
            </div>

            {/* Host Agreement Section */}
            <div className="bg-stone/50 border border-sand-200 p-6 rounded-none space-y-4">
              <h4 className="text-sm font-black text-charcoal tracking-tight">Host STR Service Agreement</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest block mb-1">Agreement Owner Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter owner's full legal name"
                    value={agreementOwnerName}
                    onChange={(e) => setAgreementOwnerName(e.target.value)}
                    className="w-full px-3 py-2 border border-sand-200 rounded-none text-xs outline-none focus:border-terracotta font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest block mb-1">Agreement Owner Address</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter owner's permanent address"
                    value={agreementOwnerAddress}
                    onChange={(e) => setAgreementOwnerAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-sand-200 rounded-none text-xs outline-none focus:border-terracotta font-semibold"
                  />
                </div>
              </div>

              {agreementSignature ? (
                <div className="p-4 bg-white border border-sand-200 rounded-none flex items-center justify-between">
                  <div>
                    <span className="text-[8px] font-black text-charcoal-muted uppercase tracking-wider block">Signature Saved</span>
                    <img src={getImageUrl(agreementSignature)} alt="Owner Signature" className="h-12 object-contain mt-1" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setAgreementSignature('')}
                    className="text-xs text-red-500 font-bold uppercase tracking-wider hover:underline"
                  >
                    Resign
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAgreementModal(true)}
                  className="w-full py-3 border-2 border-dashed border-sand-300 hover:border-terracotta bg-white text-xs font-black uppercase tracking-wider text-charcoal text-center"
                >
                  Draw Agreement Signature
                </button>
              )}
            </div>

            {/* Terms and Consent Checkbox */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="consent-check"
                checked={verificationConsent}
                onChange={(e) => setVerificationConsent(e.target.checked)}
                className="mt-1"
                required
              />
              <label htmlFor="consent-check" className="text-[11px] font-bold text-charcoal-muted leading-relaxed cursor-pointer">
                I hereby declare that all information, documents, and agreement signatures uploaded on behalf of {owner.full_name} are correct and true. I authorize the platform administrators to verify these documents.
              </label>
            </div>

            <div className="flex justify-end space-x-4 border-t border-gray-100 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-200 text-charcoal-muted hover:text-charcoal rounded-xl text-xs uppercase tracking-widest font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !aadharCard || !propertyProof || !cancelledCheque || !shopAct || !agreementSignature || !verificationConsent}
                className="btn-premium px-8 py-3 shadow-premium text-xs uppercase tracking-widest font-bold disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Verification'}
              </button>
            </div>
          </form>
        )}

        {/* Modal: Draw Signature */}
        {showAgreementModal && (
          <div className="fixed inset-0 bg-charcoal/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-elevated border border-gray-100">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-charcoal">Draw Owner Signature</h3>
                  <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest mt-1">Please ask the owner to sign on the screen</p>
                </div>
                <button 
                  onClick={() => setShowAgreementModal(false)}
                  className="w-8 h-8 rounded-full bg-stone flex items-center justify-center text-charcoal-muted hover:text-terracotta"
                >
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className="border border-sand-200 rounded-none overflow-hidden bg-stone mb-4">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={() => setIsDrawing(false)}
                  onMouseLeave={() => setIsDrawing(false)}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={() => setIsDrawing(false)}
                  className="w-full block bg-white cursor-crosshair"
                />
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-xs text-charcoal-muted font-bold uppercase tracking-wider hover:text-charcoal"
                >
                  Clear Pad
                </button>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAgreementModal(false)}
                    className="px-4 py-2 border border-gray-200 text-xs font-bold uppercase tracking-wider text-charcoal-muted hover:text-charcoal rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSignatureAndAgreement}
                    className="px-6 py-2 bg-charcoal hover:bg-terracotta text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                  >
                    Save Signature
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default BrokerDashboard;
