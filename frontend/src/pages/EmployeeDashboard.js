import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient, { verificationAPI, getImageUrl } from '../services/api';
import { NotificationBell } from '../components/NotificationCenter';
import { formatCategoryLabel, formatDisplayLabel, formatPropertyTypeLabel, formatReadableText } from '../lib/displayLabels';
import { 
  Users, Building2, FileCheck, AlertCircle, CheckCircle, 
  XCircle, Download, FileText, BarChart3, LogOut, Eye, ChevronLeft, ChevronRight
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
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <span className="text-xl font-black text-charcoal tracking-tight group-hover:text-terracotta transition-colors">x-space360<span className="text-terracotta">.in</span></span>
          </div>
          <div className="flex items-center space-x-6">
            <span className="text-charcoal-light">RM: {user?.full_name}</span>
            <NotificationBell />
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
  const navigate = useNavigate();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyVerifications, setHistoryVerifications] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [showRejectReasonModal, setShowRejectReasonModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
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

  const handleApprove = async (verificationId) => {
    const remarks = prompt('Add remarks (If Applicable):') || '';
    try {
      await verificationAPI.rmApprove(verificationId, remarks);
      alert('Verification approved! Forwarded to admin for final approval.');
      fetchPendingVerifications();
      fetchHistoryVerifications();
      setSelectedVerification(null);
    } catch (error) {
      console.error('Error approving verification:', error);
      const msg = error?.response?.data?.detail || 'Failed to approve verification';
      alert(msg);
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
              <div key={verification.verification_id} className="dashboard-card" data-testid={`verification-${verification.verification_id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {verification.property_details && (
                      <img
                        src={getImageUrl(verification.property_details.images?.[0]) || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded'}
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
                            <span className="text-charcoal-light">{formatDisplayLabel(key)}</span>
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
                      onClick={() => handleOpenDetails(verification)}
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
          {verifications.length > itemsPerPage && (
            <div className="mt-8 flex justify-center items-center space-x-4">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 rounded-full border border-sand-200 flex items-center justify-center text-charcoal hover:bg-sand-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-semibold text-charcoal">
                Page {currentPage} of {Math.ceil(verifications.length / itemsPerPage)}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(verifications.length / itemsPerPage), p + 1))}
                disabled={currentPage === Math.ceil(verifications.length / itemsPerPage)}
                className="w-10 h-10 rounded-full border border-sand-200 flex items-center justify-center text-charcoal hover:bg-sand-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      <div className="mt-12 pt-8 border-t border-sand-200">
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
              <div key={verification.verification_id} className="dashboard-card bg-sand-50/50 border border-sand-200" data-testid={`history-${verification.verification_id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {verification.property_details && (
                      <img
                        src={getImageUrl(verification.property_details.images?.[0]) || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded'}
                        alt={verification.property_details.title}
                        className="w-20 h-20 rounded-lg object-cover border border-sand-200"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-bold text-charcoal text-base">
                          {verification.property_details?.title || 'Property'}
                        </h4>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                          verification.status === 'approved' || verification.rm_approved === true ? 'bg-green-100 text-green-800' :
                          verification.status === 'rejected' || verification.rm_approved === false ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {verification.status}
                        </span>
                      </div>
                      <p className="text-xs text-charcoal-light mt-1">
                        {verification.property_details?.city} | {verification.property_details?.bhk_type}
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
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenDetails(verification)}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition font-bold text-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Details</span>
                    </button>
                    <button
                      onClick={() => handleExportReport(verification.verification_id)}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-sand-100 text-charcoal-light hover:text-charcoal rounded-lg transition font-bold text-xs"
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
          <div className="dashboard-card text-center py-8 bg-sand-50/50">
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
                <h3 className="text-2xl font-black text-charcoal">Verification Report</h3>
                <p className="text-charcoal-light">
                  {selectedVerification.property_details?.title} | {selectedVerification.property_details?.city}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleExportReport(selectedVerification.verification_id)}
                  className="flex items-center space-x-2 px-3 py-2 bg-sand-100 text-charcoal-light hover:text-terracotta rounded-xl transition font-bold text-xs"
                  title="Export Professional Report"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Report</span>
                </button>
                <button 
                  onClick={() => setSelectedVerification(null)}
                  className="p-2 hover:bg-sand-100 rounded-full transition"
                >
                  <XCircle className="w-6 h-6 text-charcoal-muted" />
                </button>
              </div>
            </div>

            <div className="space-y-8">
              {/* Info grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-sand-50 rounded-2xl">
                  <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">Property Details</p>
                  <p className="font-mono text-xs font-bold text-charcoal break-all" title={selectedVerification.property_id || ''}>
                    ID: {selectedVerification.property_id || 'N/A'}
                  </p>
                  <p className="font-mono text-[10px] text-charcoal-light mt-1 break-all" title={selectedVerification.owner_id || ''}>
                    Host: {selectedVerification.owner_id || 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-sand-50 rounded-2xl">
                  <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">Assigned Broker</p>
                  <p className="font-bold text-charcoal">{selectedVerification.broker_details?.full_name || 'N/A'}</p>
                  <p className="font-mono text-[10px] text-charcoal-light mt-1 break-all" title={selectedVerification.broker_id || ''}>
                    ID: {selectedVerification.broker_id || 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-sand-50 rounded-2xl">
                  <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1">Visit Date</p>
                  <p className="font-bold text-charcoal">
                    {new Date(selectedVerification.completed_at || selectedVerification.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Property Details Info Section */}
              {selectedVerification.property_details && (
                <div className="p-6 bg-sand-50/50 rounded-2xl border border-sand-200/60 space-y-4">
                  <h4 className="text-xs font-black text-charcoal uppercase tracking-widest border-b border-sand-200 pb-2">
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
                              className="w-48 h-32 object-cover rounded-2xl border border-sand-200/80 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 cursor-pointer shrink-0"
                              onClick={() => window.open(getImageUrl(pureUrl), '_blank')}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-[9px] font-black text-charcoal-muted uppercase tracking-wider">Property Type</p>
                      <p className="font-bold text-charcoal">
                        {formatPropertyTypeLabel(selectedVerification.property_details.property_type) || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-charcoal-muted uppercase tracking-wider">Category</p>
                      <p className="font-bold text-charcoal">
                        {formatCategoryLabel(selectedVerification.property_details.category) || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-charcoal-muted uppercase tracking-wider">BHK / Config</p>
                      <p className="font-bold text-charcoal">
                        {formatDisplayLabel(selectedVerification.property_details.bhk_type) || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-charcoal-muted uppercase tracking-wider">Area (Sqft)</p>
                      <p className="font-bold text-charcoal">
                        {selectedVerification.property_details.area_sqft ? `${selectedVerification.property_details.area_sqft} sqft` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-charcoal-muted uppercase tracking-wider">Price / Pricing Cycle</p>
                      <p className="font-bold text-terracotta">
                        {selectedVerification.property_details.price_per_night !== undefined 
                          ? `₹${selectedVerification.property_details.price_per_night} / ${selectedVerification.property_details.pricing_cycle || 'night'}` 
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-charcoal-muted uppercase tracking-wider">Location Status</p>
                      <p className="font-bold text-charcoal truncate" title={`${selectedVerification.property_details.address}, ${selectedVerification.property_details.city}`}>
                        {selectedVerification.property_details.city || 'N/A'}
                      </p>
                    </div>
                    {selectedVerification.property_details.category === 'event_venue' && (
                      <>
                        <div>
                          <p className="text-[9px] font-black text-charcoal-muted uppercase tracking-wider">Veg Plate Price</p>
                          <p className="font-bold text-charcoal">
                            {selectedVerification.property_details.veg_price ? `₹${selectedVerification.property_details.veg_price}` : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-charcoal-muted uppercase tracking-wider">Non-Veg Plate Price</p>
                          <p className="font-bold text-charcoal">
                            {selectedVerification.property_details.non_veg_price ? `₹${selectedVerification.property_details.non_veg_price}` : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-charcoal-muted uppercase tracking-wider">Max Guest Size</p>
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
                      <p className="text-[9px] font-black text-charcoal-muted uppercase tracking-wider mb-1">Description</p>
                      <p className="text-xs text-charcoal-light leading-relaxed">
                        {formatReadableText(selectedVerification.property_details.description)}
                      </p>
                    </div>
                  )}

                  {/* Full Address */}
                  {selectedVerification.property_details.address && (
                    <div className="pt-2">
                      <p className="text-[9px] font-black text-charcoal-muted uppercase tracking-wider mb-1">Full Address</p>
                      <p className="text-xs text-charcoal-light leading-relaxed">
                        {selectedVerification.property_details.address}, {selectedVerification.property_details.city}, {selectedVerification.property_details.state} - {selectedVerification.property_details.pin_code}
                      </p>
                    </div>
                  )}

                  {/* Amenities */}
                  {selectedVerification.property_details.amenities && selectedVerification.property_details.amenities.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[9px] font-black text-charcoal-muted uppercase tracking-wider mb-2">Amenities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedVerification.property_details.amenities.map((amenity, i) => (
                          <span key={i} className="px-2 py-1 bg-white border border-sand-200 rounded-lg text-[10px] font-semibold text-charcoal capitalize">
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
                <h4 className="text-sm font-black text-charcoal uppercase tracking-widest mb-4">Verification Checklist Audit</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(selectedVerification.checklist || {}).map(([key, value]) => (
                    <div key={key} className="flex flex-col p-4 bg-white border border-sand-200 rounded-2xl hover:shadow-md transition">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-charcoal">{formatDisplayLabel(key)}</span>
                        {value ? (
                          <div className="flex items-center space-x-1 text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            <span className="text-[8px] font-black uppercase">Broker Verified</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 text-red-600">
                            <XCircle className="w-3 h-3" />
                            <span className="text-[8px] font-black uppercase">Broker Failed</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => {
                            // In a real audit, this might update a local state, 
                            // but for now we just show a success toast or similar
                            alert(`Confirmed: ${formatDisplayLabel(key)} is approved.`);
                          }}
                          className="flex-1 py-2 bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-green-100 transition flex items-center justify-center space-x-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Approve</span>
                        </button>
                        <button 
                          onClick={() => {
                            setRejectReason(`Rejected Point: ${formatDisplayLabel(key).toUpperCase()} - `);
                            setShowRejectReasonModal(true);
                          }}
                          className="flex-1 py-2 bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-red-100 transition flex items-center justify-center space-x-1"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Broker Remarks */}
              {selectedVerification.broker_remarks && (
                <div className="p-6 bg-terracotta/5 rounded-2xl border border-terracotta/10">
                  <h4 className="text-sm font-black text-terracotta uppercase tracking-widest mb-2">Broker Remarks</h4>
                  <p className="text-charcoal leading-relaxed italic">"{selectedVerification.broker_remarks}"</p>
                </div>
              )}

              {/* Geo-tagged Photos */}
              {selectedVerification.geo_tagged_photos && selectedVerification.geo_tagged_photos.length > 0 && (
                <div>
                  <h4 className="text-sm font-black text-charcoal uppercase tracking-widest mb-4">
                    Geo-tagged Evidence ({selectedVerification.geo_tagged_photos.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {selectedVerification.geo_tagged_photos.map((photo, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => window.open(getImageUrl(photo.photo_url || photo.url), '_blank')}
                        className="group relative aspect-square rounded-xl overflow-hidden bg-sand-100 cursor-pointer hover:ring-4 hover:ring-terracotta/20 transition"
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
                  <h4 className="text-sm font-black text-blue-800 uppercase tracking-widest mb-2">Property Video Tour</h4>
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
            <div className="flex space-x-4 mt-8 pt-8 border-t border-sand-200">
              <button 
                onClick={() => setShowRejectReasonModal(true)}
                className="flex-1 py-4 bg-red-50 text-red-600 font-black uppercase tracking-widest rounded-2xl hover:bg-red-100 transition flex items-center justify-center space-x-2"
              >
                <XCircle className="w-5 h-5" />
                <span>Reject Report</span>
              </button>
              <button 
                onClick={() => handleApprove(selectedVerification.verification_id)}
                className="flex-1 py-4 bg-green-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-green-700 shadow-lg shadow-green-200 transition flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Approve Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Rejection Reason Modal */}
      {showRejectReasonModal && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-black text-charcoal">Rejection Reason</h3>
              <p className="text-charcoal-light text-sm mt-1">Please provide a detailed reason for rejecting this verification report.</p>
            </div>
            
            <textarea
              className="w-full border-2 border-sand-200 rounded-2xl p-4 focus:border-red-500 outline-none transition min-h-[120px] text-charcoal font-medium"
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
                className="flex-1 py-4 bg-red-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-red-700 shadow-lg shadow-red-200 transition"
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
    } catch (error) {
      console.error('Error fetching broker properties:', error);
      setBrokerProperties([]);
    } finally {
      setLoadingProperties(false);
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
                      <div 
                        onClick={() => handleShowOwners(broker)}
                        className="text-center p-2 bg-sand-50 rounded hover:bg-sand-100 hover:shadow-sm cursor-pointer transition-all duration-300 border border-transparent hover:border-terracotta/20"
                        title="Click to view assigned Owners"
                      >
                        <p className="text-lg font-bold text-terracotta">{broker.stats.owners}</p>
                        <p className="text-xs text-charcoal-light hover:text-terracotta transition-colors">Owners</p>
                      </div>
                      <div 
                        onClick={() => handleShowProperties(broker)}
                        className="text-center p-2 bg-sand-50 rounded hover:bg-sand-100 hover:shadow-sm cursor-pointer transition-all duration-300 border border-transparent hover:border-sage/20"
                        title="Click to view Broker's Property Portfolio"
                      >
                        <p className="text-lg font-bold text-sage">{broker.stats.properties}</p>
                        <p className="text-xs text-charcoal-light hover:text-sage transition-colors">Properties</p>
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

      {/* Assigned Owners Details Modal */}
      {selectedBrokerForOwners && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-premium animate-slide-up max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black text-charcoal">Assigned Owners</h3>
                <p className="text-charcoal-light text-xs font-bold uppercase tracking-widest mt-1">
                  Portfolio of Broker: {selectedBrokerForOwners.full_name} ({selectedBrokerForOwners.lg_code || 'N/A'})
                </p>
              </div>
              <button 
                onClick={() => {
                  setSelectedBrokerForOwners(null);
                  setBrokerOwners([]);
                }}
                className="p-2 hover:bg-sand-100 rounded-full transition"
              >
                <XCircle className="w-6 h-6 text-charcoal-muted" />
              </button>
            </div>

            {loadingOwners ? (
              <div className="text-center py-12">
                <p className="text-charcoal-light font-bold">Fetching owners network...</p>
              </div>
            ) : brokerOwners.length > 0 ? (
              <div className="space-y-4">
                {brokerOwners.map((owner) => (
                  <div key={owner.user_id} className="p-6 bg-sand-50 rounded-2xl border border-sand-200 hover:border-terracotta transition-all duration-300">
                    <div className="flex items-start space-x-4">
                      <img
                        src={owner.profile_image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'}
                        alt={owner.full_name}
                        className="w-16 h-16 rounded-2xl object-cover border border-sand-200 shadow-sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="font-bold text-charcoal text-lg truncate">{owner.full_name}</h4>
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            owner.kyc_status === 'approved' ? 'bg-green-100 text-green-800' :
                            owner.kyc_status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            KYC: {owner.kyc_status || 'pending'}
                          </span>
                        </div>
                        <p className="text-xs text-charcoal-light font-medium mt-1">{owner.email}</p>
                        <p className="text-xs text-charcoal-light font-medium">{owner.phone}</p>
                        
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-sand-200">
                          <div>
                            <p className="text-[9px] font-black text-charcoal-muted uppercase tracking-wider">City / Location</p>
                            <p className="text-xs font-bold text-charcoal mt-0.5">{owner.city || 'Not Specified'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-charcoal-muted uppercase tracking-wider">Reg. Fee Payment</p>
                            <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded mt-0.5 ${
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
              <div className="text-center py-12 bg-sand-50 rounded-2xl border-2 border-dashed border-sand-200">
                <Users className="w-12 h-12 text-charcoal-light mx-auto mb-3" />
                <p className="text-charcoal-light font-bold">No Owners assigned to this broker yet.</p>
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
                <h3 className="text-2xl font-black text-charcoal">Property Portfolio</h3>
                <p className="text-charcoal-light text-xs font-bold uppercase tracking-widest mt-1">
                  Properties of Broker: {selectedBrokerForProperties.full_name} ({selectedBrokerForProperties.lg_code || 'N/A'})
                </p>
              </div>
              <button 
                onClick={() => {
                  setSelectedBrokerForProperties(null);
                  setBrokerProperties([]);
                }}
                className="p-2 hover:bg-sand-100 rounded-full transition"
              >
                <XCircle className="w-6 h-6 text-charcoal-muted" />
              </button>
            </div>

            {loadingProperties ? (
              <div className="text-center py-12">
                <p className="text-charcoal-light font-bold">Fetching property portfolio...</p>
              </div>
            ) : brokerProperties.length > 0 ? (
              <div className="space-y-4">
                {brokerProperties.map((property) => (
                  <div key={property.property_id} className="p-6 bg-sand-50 rounded-2xl border border-sand-200 hover:border-sage transition-all duration-300">
                    <div className="flex items-start space-x-4">
                      <img
                        src={getImageUrl(property.images?.[0]) || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded'}
                        alt={property.title}
                        className="w-24 h-24 rounded-2xl object-cover border border-sand-200 shadow-sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="font-bold text-charcoal text-lg truncate">{property.title}</h4>
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
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
                        
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-sand-200">
                          <div>
                            <p className="text-[9px] font-black text-charcoal-muted uppercase tracking-wider">Category</p>
                            <p className="text-xs font-bold text-charcoal mt-0.5">{formatCategoryLabel(property.category) || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-charcoal-muted uppercase tracking-wider">BHK Type</p>
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
              <div className="text-center py-12 bg-sand-50 rounded-2xl border-2 border-dashed border-sand-200">
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
