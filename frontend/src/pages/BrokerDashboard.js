import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient, { verificationAPI, getImageUrl } from '../services/api';
import { createPortal } from 'react-dom';
import { formatCategoryLabel, formatDisplayLabel, formatPropertyTypeLabel, formatReadableText } from '../lib/displayLabels';
import { 
  Users, Building2, FileCheck, Target, IndianRupee, 
  AlertCircle, Plus, CheckCircle, XCircle, Clock, 
  MapPin, Camera, LogOut, Bell, ChevronRight, ChevronLeft
} from 'lucide-react';

const BrokerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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
        <div className="w-full flex justify-between items-center">
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => navigate('/')}
          >
            <img src="/logo.png" alt="X-Space360 Logo" className="h-8 w-auto object-contain" />
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4 px-4 py-2 bg-white/50 border border-gray-100 rounded-full shadow-sm">
               <div className="w-7 h-7 rounded-full bg-sage flex items-center justify-center text-[10px] font-bold tracking-tight text-white">
                  {user?.full_name?.[0]}
               </div>
               <span className="text-[10px] font-bold tracking-tight text-charcoal uppercase tracking-widest">{user?.full_name}</span>
            </div>
            <button
              onClick={() => {
                navigate('/');
                setTimeout(() => {
                  logout();
                }, 50);
              }}
              className="flex items-center space-x-2 text-[10px] font-bold tracking-tight text-terracotta uppercase tracking-[0.2em] hover:underline transition-all"
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="w-full px-4 md:px-8 lg:px-12 py-10 mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12 animate-fade-in">
          <div>
            <h2 className="text-4xl font-bold tracking-tight text-charcoal tracking-tight mb-2" data-testid="dashboard-title">
              Operational Command
            </h2>
            <p className="text-charcoal-muted font-bold text-xs uppercase tracking-widest">Global overview of your owner network and properties</p>
          </div>
          <div className="flex items-center space-x-4">
             <div className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm cursor-pointer hover:shadow-premium transition-all">
                <Bell className="w-5 h-5 text-charcoal" />
             </div>
             <button className="btn-premium px-8 py-4 shadow-premium">
                <Plus className="w-5 h-5 mr-2" />
                <span className="text-sm font-bold tracking-tight uppercase tracking-widest">New Verification</span>
             </button>
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
                  <div className="bg-charcoal rounded-3xl p-10 shadow-elevated" data-testid="quick-actions">
                    <h3 className="text-xl font-bold tracking-tight text-white tracking-tight mb-8">System Shortcuts</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { id: 'leads', label: 'GENERATE LEAD', icon: Target, color: 'text-terracotta' },
                        { id: 'verifications', label: 'SITE INSPECTION', icon: FileCheck, color: 'text-sage' },
                        { id: 'owners', label: 'NETWORK VIEW', icon: Users, color: 'text-white' }
                      ].map(action => (
                        <button
                          key={action.id}
                          onClick={() => setActiveTab(action.id)}
                          className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-white hover:border-white transition-all group"
                          data-testid={`action-${action.id}`}
                        >
                          <div className="flex items-center space-x-4">
                             <action.icon className={`w-6 h-6 ${action.color}`} />
                             <span className="text-[10px] font-bold tracking-tight text-white/80 group-hover:text-charcoal uppercase tracking-[0.2em]">{action.label}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-charcoal group-hover:translate-x-1 transition-all" />
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
      </div>
    </div>
  );
};

// My Owners Section
const MyOwnersSection = () => {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);

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
              <div className="flex items-start space-x-6">
                <div className="relative flex-shrink-0">
                   <div className="absolute inset-0 bg-terracotta blur-xl opacity-0 group-hover:opacity-20 transition-opacity"></div>
                   <img
                     src={owner.profile_image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'}
                     alt={owner.full_name}
                     className="relative w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-sm"
                   />
                </div>
                <div className="flex-1 min-w-0">
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

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <span className="inline-flex px-3 py-1 bg-stone text-terracotta text-[9px] font-bold tracking-tight uppercase tracking-widest rounded-full border border-gray-100">
                      {owner.property_count || 0} Assets
                    </span>
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
                  <div className="flex items-center space-x-6">
                    <div className="relative overflow-hidden w-24 h-24 rounded-2xl">
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
                    <div className="flex items-center space-x-6">
                      <div className="relative overflow-hidden w-24 h-24 rounded-2xl shadow-sm">
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
  const initialChecklist = {
    address_matches_gps: false,
    structural_condition_good: false,
    amenities_verified: false,
    compliance_docs_present: false,
    all_rooms_photographed: false,
    entrance_photographed: false,
    video_walkthrough_uploaded: false,
    no_discrepancies: false,
  };
  const [checklist, setChecklist] = useState(initialChecklist);
  const [checklistReasons, setChecklistReasons] = useState({
    address_matches_gps: '',
    structural_condition_good: '',
    amenities_verified: '',
    compliance_docs_present: '',
    all_rooms_photographed: '',
    entrance_photographed: '',
    video_walkthrough_uploaded: '',
    no_discrepancies: '',
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
        appendedRemarks += `\n- ${key.replaceAll('_', ' ')}: ${checklistReasons[key].trim()}`;
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
                      {formatDisplayLabel(key)}
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

export default BrokerDashboard;
