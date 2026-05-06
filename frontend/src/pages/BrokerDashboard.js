import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import { 
  Users, Building2, FileCheck, Target, DollarSign, 
  AlertCircle, Plus, CheckCircle, XCircle, Clock, 
  MapPin, Camera, LogOut, Bell
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
      icon: DollarSign, 
      color: 'sage',
      subtext: `₹${(stats.commission.paid / 100).toLocaleString('en-IN')} Paid`
    },
  ] : [];

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Header */}
      <header className="header-glass px-6 py-4" data-testid="broker-header">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-terracotta" />
            <h1 className="text-xl font-bold text-charcoal">PropNest - Broker Panel</h1>
          </div>
          <div className="flex items-center space-x-6">
            <span className="text-charcoal-light">Broker: {user?.full_name}</span>
            <button
              onClick={logout}
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
            Broker Dashboard
          </h2>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 mb-8 border-b border-stone" data-testid="broker-tabs">
          {[
            { id: 'overview', label: 'Overview', icon: Building2 },
            { id: 'owners', label: 'My Owners', icon: Users },
            { id: 'properties', label: 'Properties', icon: Building2 },
            { id: 'verifications', label: 'Verifications', icon: FileCheck },
            { id: 'leads', label: 'Leads', icon: Target },
            { id: 'commissions', label: 'Commissions', icon: DollarSign },
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
                      {stat.subtext && <p className="text-xs text-charcoal-muted mt-2">{stat.subtext}</p>}
                    </div>
                  ))}
                </div>

                {/* Pending Verifications Alert */}
                {stats && stats.verifications.pending > 0 && (
                  <div className="dashboard-card bg-yellow-50 border-l-4 border-yellow-500 mb-8" data-testid="pending-alert">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-6 h-6 text-yellow-600" />
                      <div>
                        <p className="font-bold text-charcoal">
                          {stats.verifications.pending} Properties Pending Verification
                        </p>
                        <p className="text-sm text-charcoal-light">Complete site visits and submit verification reports</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('verifications')}
                        className="btn-primary ml-auto"
                      >
                        View Tasks
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="dashboard-card" data-testid="quick-actions">
                  <h3 className="text-xl font-bold text-charcoal mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setActiveTab('leads')}
                      className="flex items-center space-x-3 p-4 bg-sand-50 rounded-lg hover:bg-sand-100 transition"
                      data-testid="action-add-lead"
                    >
                      <Target className="w-6 h-6 text-terracotta" />
                      <span className="font-semibold text-charcoal">Add New Lead</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('verifications')}
                      className="flex items-center space-x-3 p-4 bg-sand-50 rounded-lg hover:bg-sand-100 transition"
                      data-testid="action-verify"
                    >
                      <FileCheck className="w-6 h-6 text-sage" />
                      <span className="font-semibold text-charcoal">Complete Verification</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('owners')}
                      className="flex items-center space-x-3 p-4 bg-sand-50 rounded-lg hover:bg-sand-100 transition"
                      data-testid="action-view-owners"
                    >
                      <Users className="w-6 h-6 text-terracotta" />
                      <span className="font-semibold text-charcoal">View My Owners</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

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
    <div data-testid="owners-section">
      <div className="dashboard-card mb-6">
        <h3 className="text-2xl font-bold text-charcoal mb-2">My Property Owners</h3>
        <p className="text-charcoal-light">View all property owners assigned to you</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-charcoal-light">Loading owners...</p>
        </div>
      ) : owners.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="owners-list">
          {owners.map((owner) => (
            <div key={owner.user_id} className="dashboard-card" data-testid={`owner-${owner.user_id}`}>
              <div className="flex items-center space-x-4">
                <img
                  src={owner.profile_image}
                  alt={owner.full_name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="flex-1">
                  <h4 className="font-bold text-charcoal">{owner.full_name}</h4>
                  <p className="text-sm text-charcoal-light">{owner.email}</p>
                  <p className="text-sm text-charcoal-light">{owner.phone}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="inline-block px-2 py-1 bg-terracotta/10 text-terracotta text-xs font-semibold rounded">
                      {owner.property_count} Properties
                    </span>
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                      owner.kyc_status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      KYC: {owner.kyc_status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="dashboard-card text-center py-12">
          <Users className="w-16 h-16 text-charcoal-light mx-auto mb-4" />
          <p className="text-charcoal-light">No owners assigned yet</p>
        </div>
      )}
    </div>
  );
};

// Properties Section
const PropertiesSection = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

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
    <div data-testid="properties-section">
      <div className="dashboard-card mb-6">
        <h3 className="text-2xl font-bold text-charcoal mb-2">STR Properties</h3>
        <p className="text-charcoal-light">All properties under your management</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-charcoal-light">Loading properties...</p>
        </div>
      ) : properties.length > 0 ? (
        <div className="space-y-4" data-testid="properties-list">
          {properties.map((property) => (
            <div key={property.property_id} className="dashboard-card" data-testid={`property-${property.property_id}`}>
              <div className="flex items-start space-x-4">
                <img
                  src={property.images[0] || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded'}
                  alt={property.title}
                  className="w-24 h-24 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h4 className="font-bold text-charcoal text-lg">{property.title}</h4>
                  <p className="text-sm text-charcoal-light mt-1">
                    {property.city} | {property.bhk_type} | {property.category}
                  </p>
                  <div className="flex items-center space-x-2 mt-3">
                    <span className="text-lg font-bold text-terracotta">₹{property.price_per_night}</span>
                    <span className="text-sm text-charcoal-light">/night</span>
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ml-4 ${
                      property.status === 'live' ? 'bg-green-100 text-green-700' :
                      property.status === 'pending_verification' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {property.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="dashboard-card text-center py-12">
          <Building2 className="w-16 h-16 text-charcoal-light mx-auto mb-4" />
          <p className="text-charcoal-light">No properties found</p>
        </div>
      )}
    </div>
  );
};

// Verifications Section
const VerificationsSection = () => {
  return (
    <div className="dashboard-card" data-testid="verifications-section">
      <h3 className="text-2xl font-bold text-charcoal mb-4">Property Verifications</h3>
      <p className="text-charcoal-light mb-4">Complete property verification with geo-tagged photos</p>
      <div className="bg-sand-50 p-6 rounded-lg">
        <h4 className="font-bold text-charcoal mb-3">Verification Checklist:</h4>
        <ul className="space-y-2 text-charcoal-light">
          <li className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-sage" />
            <span>Property address matches GPS location</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-sage" />
            <span>Structural condition assessment</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-sage" />
            <span>Amenities verification</span>
          </li>
          <li className="flex items-center space-x-2">
            <Camera className="w-4 h-4 text-terracotta" />
            <span>Geo-tagged photos (auto GPS stamp)</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-sage" />
            <span>Video walkthrough</span>
          </li>
        </ul>
        <p className="text-sm text-charcoal-muted mt-4">
          Full verification interface coming soon - complete with mobile photo upload and GPS auto-tagging
        </p>
      </div>
    </div>
  );
};

// Leads Section
const LeadsSection = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchLeads();
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

  return (
    <div data-testid="leads-section">
      <div className="dashboard-card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-charcoal mb-2">Leads Management</h3>
            <p className="text-charcoal-light">Track and convert STR property leads</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary flex items-center space-x-2"
            data-testid="add-lead-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="dashboard-card mb-6 bg-sand-50" data-testid="add-lead-form">
          <h4 className="font-bold text-charcoal mb-4">Add New Lead</h4>
          <p className="text-sm text-charcoal-light">Lead creation form coming soon</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-charcoal-light">Loading leads...</p>
        </div>
      ) : leads.length > 0 ? (
        <div className="space-y-4" data-testid="leads-list">
          {leads.map((lead) => (
            <div key={lead.lead_id} className="dashboard-card" data-testid={`lead-${lead.lead_id}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-charcoal">{lead.full_name}</h4>
                  <p className="text-sm text-charcoal-light">{lead.phone} | {lead.email}</p>
                  <p className="text-sm text-charcoal-light mt-1">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    {lead.city} | {lead.property_type}
                  </p>
                  {lead.notes && (
                    <p className="text-sm text-charcoal-muted mt-2 italic">{lead.notes}</p>
                  )}
                </div>
                <span className={`inline-block px-3 py-1 text-xs font-semibold rounded ${
                  lead.status === 'converted' ? 'bg-green-100 text-green-700' :
                  lead.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                  lead.status === 'lost' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {lead.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="dashboard-card text-center py-12">
          <Target className="w-16 h-16 text-charcoal-light mx-auto mb-4" />
          <p className="text-charcoal-light mb-4">No leads yet</p>
          <button onClick={() => setShowAddForm(true)} className="btn-primary">
            Add Your First Lead
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
    <div data-testid="commissions-section">
      <div className="dashboard-card mb-6">
        <h3 className="text-2xl font-bold text-charcoal mb-2">Commission Tracking</h3>
        <p className="text-charcoal-light">View-only commission history (managed by admin)</p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="dashboard-card bg-green-50">
            <DollarSign className="w-8 h-8 text-green-600 mb-2" />
            <p className="text-2xl font-bold text-green-700">₹{(summary.total_earned / 100).toLocaleString('en-IN')}</p>
            <p className="text-sm text-green-600">Total Earned</p>
          </div>
          <div className="dashboard-card bg-blue-50">
            <CheckCircle className="w-8 h-8 text-blue-600 mb-2" />
            <p className="text-2xl font-bold text-blue-700">₹{(summary.paid / 100).toLocaleString('en-IN')}</p>
            <p className="text-sm text-blue-600">Paid</p>
          </div>
          <div className="dashboard-card bg-yellow-50">
            <Clock className="w-8 h-8 text-yellow-600 mb-2" />
            <p className="text-2xl font-bold text-yellow-700">₹{(summary.pending / 100).toLocaleString('en-IN')}</p>
            <p className="text-sm text-yellow-600">Pending</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-charcoal-light">Loading commissions...</p>
        </div>
      ) : commissions.length > 0 ? (
        <div className="space-y-4" data-testid="commissions-list">
          {commissions.map((commission) => (
            <div key={commission.commission_id} className="dashboard-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-charcoal">
                    Booking: {commission.booking_id}
                  </p>
                  <p className="text-sm text-charcoal-light mt-1">
                    Commission: ₹{(commission.commission_amount / 100).toFixed(2)} 
                    ({commission.commission_percentage}% of ₹{(commission.booking_amount / 100).toFixed(2)})
                  </p>
                  <p className="text-xs text-charcoal-muted mt-1">
                    Source: {commission.booking_source}
                  </p>
                </div>
                <span className={`inline-block px-3 py-1 text-xs font-semibold rounded ${
                  commission.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {commission.payment_status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="dashboard-card text-center py-12">
          <DollarSign className="w-16 h-16 text-charcoal-light mx-auto mb-4" />
          <p className="text-charcoal-light">No commissions yet</p>
        </div>
      )}
    </div>
  );
};

export default BrokerDashboard;
