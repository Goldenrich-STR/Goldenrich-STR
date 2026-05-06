import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import { 
  Users, Building2, FileCheck, AlertCircle, CheckCircle, 
  XCircle, Download, FileText, BarChart3, LogOut, Eye
} from 'lucide-react';

const EmployeeDashboard = () => {
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
      const response = await apiClient.get('/employee/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats ? [
    { 
      label: 'Total Brokers', 
      value: stats.brokers.total, 
      icon: Users, 
      color: 'terracotta'
    },
    { 
      label: 'Pending Reviews', 
      value: stats.verifications.pending_review, 
      icon: FileCheck, 
      color: 'sage'
    },
    { 
      label: 'Under Review', 
      value: stats.verifications.under_review, 
      icon: AlertCircle, 
      color: 'terracotta'
    },
    { 
      label: 'Expiring Subscriptions', 
      value: stats.subscriptions.expiring_soon, 
      icon: AlertCircle, 
      color: 'sage'
    },
  ] : [];

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Header */}
      <header className="header-glass px-6 py-4" data-testid="employee-header">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-terracotta" />
            <h1 className="text-xl font-bold text-charcoal">PropNest - RM Panel</h1>
          </div>
          <div className="flex items-center space-x-6">
            <span className="text-charcoal-light">RM: {user?.full_name}</span>
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
            Employee (RM) Dashboard
          </h2>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 mb-8 border-b border-stone" data-testid="employee-tabs">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'verifications', label: 'Pending Reviews', icon: FileCheck },
            { id: 'brokers', label: 'My Brokers', icon: Users },
            { id: 'reports', label: 'Reports', icon: FileText },
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
                    </div>
                  ))}
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
                      className="flex items-center space-x-3 p-4 bg-sand-50 rounded-lg hover:bg-sand-100 transition"
                      data-testid="action-review"
                    >
                      <FileCheck className="w-6 h-6 text-terracotta" />
                      <span className="font-semibold text-charcoal">Review Verifications</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('brokers')}
                      className="flex items-center space-x-3 p-4 bg-sand-50 rounded-lg hover:bg-sand-100 transition"
                      data-testid="action-brokers"
                    >
                      <Users className="w-6 h-6 text-sage" />
                      <span className="font-semibold text-charcoal">View Brokers</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('reports')}
                      className="flex items-center space-x-3 p-4 bg-sand-50 rounded-lg hover:bg-sand-100 transition"
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
        {activeTab === 'reports' && <ReportsSection />}
      </div>
    </div>
  );
};

// Verification Review Section
const VerificationReviewSection = () => {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState(null);

  useEffect(() => {
    fetchPendingVerifications();
  }, []);

  const fetchPendingVerifications = async () => {
    try {
      const response = await apiClient.get('/employee/verifications/pending');
      setVerifications(response.data.verifications || []);
    } catch (error) {
      console.error('Error fetching verifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (verificationId) => {
    const remarks = prompt('Add remarks (optional):');
    try {
      await apiClient.post(`/employee/verifications/${verificationId}/approve`, { remarks });
      alert('Verification approved! Forwarded to admin for final approval.');
      fetchPendingVerifications();
      setSelectedVerification(null);
    } catch (error) {
      console.error('Error approving verification:', error);
      alert('Failed to approve verification');
    }
  };

  const handleReject = async (verificationId) => {
    const reason = prompt('Enter rejection reason (required):');
    if (!reason) return;

    try {
      await apiClient.post(`/employee/verifications/${verificationId}/reject`, { reason });
      alert('Verification rejected. Host will be notified.');
      fetchPendingVerifications();
      setSelectedVerification(null);
    } catch (error) {
      console.error('Error rejecting verification:', error);
      alert('Failed to reject verification');
    }
  };

  return (
    <div data-testid="verifications-section">
      <div className="dashboard-card mb-6">
        <h3 className="text-2xl font-bold text-charcoal mb-2">Pending Verification Reviews</h3>
        <p className="text-charcoal-light">Remote review of broker-submitted verification reports</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-charcoal-light">Loading verifications...</p>
        </div>
      ) : verifications.length > 0 ? (
        <div className="space-y-4" data-testid="verifications-list">
          {verifications.map((verification) => (
            <div key={verification.verification_id} className="dashboard-card" data-testid={`verification-${verification.verification_id}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {verification.property_details && (
                    <img
                      src={verification.property_details.images?.[0] || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded'}
                      alt={verification.property_details.title}
                      className="w-24 h-24 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-bold text-charcoal text-lg">
                      {verification.property_details?.title || 'Property'}
                    </h4>
                    <p className="text-sm text-charcoal-light mt-1">
                      {verification.property_details?.city} | {verification.property_details?.bhk_type}
                    </p>
                    <p className="text-sm text-charcoal-muted mt-2">
                      Broker: {verification.broker_details?.full_name} ({verification.broker_details?.lg_code})
                    </p>
                    
                    {/* Checklist Summary */}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {Object.entries(verification.checklist || {}).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2 text-xs">
                          {value ? (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-600" />
                          )}
                          <span className="text-charcoal-light">{key.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>

                    {/* Geo-tagged Photos Count */}
                    {verification.geo_tagged_photos && verification.geo_tagged_photos.length > 0 && (
                      <p className="text-sm text-sage mt-3">
                        📸 {verification.geo_tagged_photos.length} geo-tagged photos
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedVerification(verification)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition font-semibold"
                    data-testid={`view-details-${verification.verification_id}`}
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Details</span>
                  </button>
                  <button
                    onClick={() => handleApprove(verification.verification_id)}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition font-semibold"
                    data-testid={`approve-${verification.verification_id}`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => handleReject(verification.verification_id)}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-semibold"
                    data-testid={`reject-${verification.verification_id}`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="dashboard-card text-center py-12">
          <FileCheck className="w-16 h-16 text-charcoal-light mx-auto mb-4" />
          <p className="text-charcoal-light">No verifications pending review</p>
        </div>
      )}
    </div>
  );
};

// Brokers Section
const BrokersSection = () => {
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div data-testid="brokers-section">
      <div className="dashboard-card mb-6">
        <h3 className="text-2xl font-bold text-charcoal mb-2">My Brokers</h3>
        <p className="text-charcoal-light">Monitor broker activity and property portfolios</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-charcoal-light">Loading brokers...</p>
        </div>
      ) : brokers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="brokers-list">
          {brokers.map((broker) => (
            <div key={broker.user_id} className="dashboard-card" data-testid={`broker-${broker.user_id}`}>
              <div className="flex items-center space-x-4">
                <img
                  src={broker.profile_image}
                  alt={broker.full_name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="flex-1">
                  <h4 className="font-bold text-charcoal">{broker.full_name}</h4>
                  <p className="text-sm text-charcoal-light">LG Code: {broker.lg_code || 'N/A'}</p>
                  <p className="text-sm text-charcoal-light">{broker.phone}</p>
                  
                  {broker.stats && (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div className="text-center p-2 bg-sand-50 rounded">
                        <p className="text-lg font-bold text-terracotta">{broker.stats.owners}</p>
                        <p className="text-xs text-charcoal-light">Owners</p>
                      </div>
                      <div className="text-center p-2 bg-sand-50 rounded">
                        <p className="text-lg font-bold text-sage">{broker.stats.properties}</p>
                        <p className="text-xs text-charcoal-light">Properties</p>
                      </div>
                      <div className="text-center p-2 bg-sand-50 rounded">
                        <p className="text-lg font-bold text-terracotta">{broker.stats.pending_verifications}</p>
                        <p className="text-xs text-charcoal-light">Pending</p>
                      </div>
                    </div>
                  )}
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
    </div>
  );
};

// Reports Section
const ReportsSection = () => {
  const [reportType, setReportType] = useState('properties_not_booked');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

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
      const response = await apiClient.get('/employee/reports/properties-not-booked/export-csv', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `properties_not_booked_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV');
    }
  };

  return (
    <div data-testid="reports-section">
      <div className="dashboard-card mb-6">
        <h3 className="text-2xl font-bold text-charcoal mb-4">Reports & Analytics</h3>
        
        {/* Report Type Selector */}
        <div className="flex items-center space-x-4 mb-6">
          <label className="text-sm font-semibold text-charcoal">Select Report:</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="input-field w-64"
            data-testid="report-type-select"
          >
            <option value="properties_not_booked">Properties Not Booked</option>
            <option value="broker_portfolio_summary">Broker Portfolio Summary</option>
          </select>
          <button
            onClick={generateReport}
            disabled={loading}
            className="btn-primary flex items-center space-x-2"
            data-testid="generate-report-btn"
          >
            <BarChart3 className="w-4 h-4" />
            <span>{loading ? 'Generating...' : 'Generate Report'}</span>
          </button>
        </div>

        {/* Report Display */}
        {reportData && (
          <div className="mt-6" data-testid="report-data">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-charcoal">
                  {reportData.report_type.replace(/_/g, ' ').toUpperCase()}
                </h4>
                <p className="text-sm text-charcoal-light">
                  Generated at: {new Date(reportData.generated_at).toLocaleString()}
                </p>
                <p className="text-sm text-charcoal-light">Total Records: {reportData.total}</p>
              </div>
              
              {reportType === 'properties_not_booked' && (
                <button
                  onClick={exportCSV}
                  className="btn-secondary flex items-center space-x-2"
                  data-testid="export-csv-btn"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
              )}
            </div>

            {/* Properties Not Booked Report */}
            {reportType === 'properties_not_booked' && reportData.properties && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {reportData.properties.map((property) => (
                  <div key={property.property_id} className="p-4 bg-sand-50 rounded-lg">
                    <h5 className="font-semibold text-charcoal">{property.title}</h5>
                    <p className="text-sm text-charcoal-light">
                      {property.city} | {property.bhk_type} | ₹{property.price_per_night}/night
                    </p>
                    <p className="text-xs text-charcoal-muted mt-1">
                      Broker: {property.broker_name} ({property.broker_lg_code})
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Broker Portfolio Summary */}
            {reportType === 'broker_portfolio_summary' && reportData.brokers && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {reportData.brokers.map((broker, idx) => (
                  <div key={idx} className="p-4 bg-sand-50 rounded-lg grid grid-cols-4 gap-4">
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
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;
