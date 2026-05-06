import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient, { verificationAPI } from '../services/api';
import { 
  Users, Building2, Calendar, DollarSign, CheckCircle, 
  XCircle, Clock, TrendingUp, BarChart3, LogOut 
} from 'lucide-react';

const AdminDashboard = () => {
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
      icon: DollarSign, 
      color: 'sage',
      subtext: 'Gross Merchandise Value'
    },
  ] : [];

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Header */}
      <header className="header-glass px-6 py-4" data-testid="admin-header">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-terracotta" />
            <h1 className="text-xl font-bold text-charcoal">PropNest - Admin Panel</h1>
          </div>
          <div className="flex items-center space-x-6">
            <span className="text-charcoal-light">Admin: {user?.full_name}</span>
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
            { id: 'cms', label: 'CMS', icon: TrendingUp },
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
                </div>

                {/* Pending Verifications Alert */}
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
          <UserManagement />
        )}

        {/* Properties Tab */}
        {activeTab === 'properties' && (
          <PropertyModeration />
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <BookingManagement />
        )}

        {/* CMS Tab */}
        {activeTab === 'cms' && (
          <CMSManagement />
        )}
      </div>
    </div>
  );
};

// User Management Component
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchUsers = async () => {
    try {
      const params = roleFilter ? { role: roleFilter } : {};
      const response = await apiClient.get('/admin/users', { params });
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
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

  return (
    <div data-testid="user-management">
      <div className="dashboard-card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-charcoal">User Management</h3>
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
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-charcoal-light">Loading users...</p>
        </div>
      ) : (
        <div className="space-y-4" data-testid="users-list">
          {users.map((user) => (
            <div key={user.user_id} className="dashboard-card" data-testid={`user-${user.user_id}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <img
                    src={user.profile_image}
                    alt={user.full_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-bold text-charcoal">{user.full_name}</h4>
                    <p className="text-sm text-charcoal-light">{user.email} | {user.phone}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="inline-block px-2 py-1 bg-terracotta/10 text-terracotta text-xs font-semibold rounded">
                        {user.role.toUpperCase()}
                      </span>
                      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                        user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleUserStatus(user.user_id, user.is_active)}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    user.is_active
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                  data-testid={`toggle-status-${user.user_id}`}
                >
                  {user.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Property Moderation Component
const PropertyModeration = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  // Default to the highest-priority queue: properties RM has approved and
  // are sitting on the admin's desk for the final call.
  const [statusFilter, setStatusFilter] = useState('awaiting_final_approval');

  useEffect(() => {
    setLoading(true);
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

  const approveProperty = async (propertyId) => {
    try {
      await verificationAPI.adminApprove(propertyId);
      alert('Property approved and is now LIVE!');
      refresh();
    } catch (error) {
      console.error('Error approving property:', error);
      const msg = error?.response?.data?.detail || 'Failed to approve property';
      alert(msg);
    }
  };

  const rejectProperty = async (propertyId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      await verificationAPI.adminReject(propertyId, reason);
      alert('Property rejected');
      refresh();
    } catch (error) {
      console.error('Error rejecting property:', error);
      const msg = error?.response?.data?.detail || 'Failed to reject property';
      alert(msg);
    }
  };

  // Admin can only act when status is `under_review` AND RM has approved
  // (server enforces this). On the awaiting-final-approval queue the entire
  // list is already filtered, so always show buttons there.
  const canActOn = (property) => {
    if (statusFilter === 'awaiting_final_approval') return true;
    return property.status === 'under_review';
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
        {statusFilter === 'awaiting_final_approval' && (
          <p className="text-sm text-charcoal-light" data-testid="queue-description">
            These properties have been physically inspected by the broker and remotely
            reviewed by an RM. Approve to take them LIVE, or reject with a reason to
            send them back to the host.
          </p>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-charcoal-light">Loading properties...</p>
        </div>
      ) : properties.length > 0 ? (
        <div className="space-y-4" data-testid="properties-list">
          {properties.map((property) => (
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
                    <p className="text-sm text-charcoal-muted mt-2">{property.description?.substring(0, 100)}...</p>
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
                        data-testid={`status-badge-${property.property_id}`}
                      >
                        {property.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {statusFilter === 'awaiting_final_approval' && (
                        <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-sage-light text-sage-dark">
                          RM APPROVED
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {canActOn(property) && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => approveProperty(property.property_id)}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition font-semibold"
                      data-testid={`approve-${property.property_id}`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => rejectProperty(property.property_id)}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-semibold"
                      data-testid={`reject-${property.property_id}`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="dashboard-card text-center py-12" data-testid="properties-empty">
          <Building2 className="w-16 h-16 text-charcoal-light mx-auto mb-4" />
          <p className="text-charcoal-light">No properties in this queue</p>
        </div>
      )}
    </div>
  );
};

// Booking Management Component
const BookingManagement = () => {
  return (
    <div className="dashboard-card" data-testid="booking-management">
      <h3 className="text-2xl font-bold text-charcoal mb-4">Booking Management</h3>
      <p className="text-charcoal-light">View and manage all platform bookings</p>
      <p className="text-sm text-charcoal-muted mt-2">Coming soon - full booking management interface</p>
    </div>
  );
};

// CMS Management Component
const CMSManagement = () => {
  return (
    <div className="dashboard-card" data-testid="cms-management">
      <h3 className="text-2xl font-bold text-charcoal mb-4">Landing Page CMS</h3>
      <p className="text-charcoal-light">Manage landing page content, hero section, and featured properties</p>
      <p className="text-sm text-charcoal-muted mt-2">Coming soon - full CMS editor interface</p>
    </div>
  );
};

export default AdminDashboard;
