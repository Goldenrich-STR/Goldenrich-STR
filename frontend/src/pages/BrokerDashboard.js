import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient, { verificationAPI } from '../services/api';
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

// Verifications Section — broker physical-visit queue + submission form
const VerificationsSection = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState(null);

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
    <div data-testid="verifications-section">
      <div className="dashboard-card mb-6">
        <h3 className="text-2xl font-bold text-charcoal mb-2">Property Verifications</h3>
        <p className="text-charcoal-light">
          Visit each assigned property, complete the checklist, upload geo-tagged photos
          and submit for RM remote review.
        </p>
      </div>

      {loading ? (
        <div className="dashboard-card text-center py-12">
          <p className="text-charcoal-light">Loading verification tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="dashboard-card text-center py-12" data-testid="verifications-empty">
          <FileCheck className="w-16 h-16 text-charcoal-light mx-auto mb-4" />
          <p className="text-charcoal-light">No verification tasks assigned</p>
        </div>
      ) : (
        <div className="space-y-4" data-testid="verifications-list">
          {tasks.map((task) => {
            const pd = task.property_details || {};
            const isOpen = task.status === 'pending' || task.status === 'in_progress';
            return (
              <div
                key={task.verification_id}
                className="dashboard-card"
                data-testid={`verification-task-${task.property_id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <img
                      src={pd.images?.[0] || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded'}
                      alt={pd.title}
                      className="w-24 h-24 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-charcoal text-lg">{pd.title || 'Property'}</h4>
                      <p className="text-sm text-charcoal-light mt-1">
                        {pd.city}{pd.address ? ` · ${pd.address}` : ''}
                      </p>
                      <div className="flex items-center space-x-2 mt-3">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                            task.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : task.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-700'
                              : task.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                          data-testid={`task-status-${task.property_id}`}
                        >
                          {task.status.replace('_', ' ').toUpperCase()}
                        </span>
                        {task.rm_reviewed && (
                          <span
                            className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                              task.rm_approved
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            RM {task.rm_approved ? 'APPROVED' : 'REJECTED'}
                          </span>
                        )}
                      </div>
                      {task.broker_remarks && (
                        <p className="text-sm text-charcoal-muted mt-2 italic">
                          Your remarks: "{task.broker_remarks}"
                        </p>
                      )}
                    </div>
                  </div>
                  {isOpen && (
                    <button
                      onClick={() => setActiveTask(task)}
                      className="flex items-center space-x-2 px-4 py-2 bg-terracotta text-white rounded-lg hover:bg-terracotta-dark transition font-semibold"
                      data-testid={`open-submit-${task.property_id}`}
                    >
                      <Camera className="w-4 h-4" />
                      <span>Submit Visit</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoLat, setPhotoLat] = useState('');
  const [photoLng, setPhotoLng] = useState('');
  const [photos, setPhotos] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggle = (k) => setChecklist({ ...checklist, [k]: !checklist[k] });

  const addPhoto = () => {
    setError('');
    if (!photoUrl) {
      setError('Photo URL is required');
      return;
    }
    const lat = parseFloat(photoLat);
    const lng = parseFloat(photoLng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError('Valid latitude and longitude required for geo-tag');
      return;
    }
    setPhotos([
      ...photos,
      {
        photo_url: photoUrl,
        latitude: lat,
        longitude: lng,
        timestamp: new Date().toISOString(),
      },
    ]);
    setPhotoUrl('');
    setPhotoLat('');
    setPhotoLng('');
  };

  const removePhoto = (idx) =>
    setPhotos(photos.filter((_, i) => i !== idx));

  const submit = async () => {
    setError('');
    if (photos.length === 0) {
      setError('At least one geo-tagged photo is required');
      return;
    }
    setSubmitting(true);
    try {
      await verificationAPI.submitVisit(task.property_id, {
        checklist,
        geo_tagged_photos: photos,
        video_url: videoUrl || null,
        broker_remarks: remarks || null,
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

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      data-testid="submit-verification-modal"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-sand-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-charcoal">
            Submit Visit — {task.property_details?.title || 'Property'}
          </h3>
          <button
            onClick={onClose}
            className="text-charcoal-light hover:text-charcoal"
            data-testid="modal-close"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Checklist */}
          <div>
            <h4 className="font-bold text-charcoal mb-3">Inspection Checklist</h4>
            <div className="space-y-2" data-testid="checklist">
              {Object.entries(checklist).map(([key, val]) => (
                <label key={key} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={val}
                    onChange={() => toggle(key)}
                    className="w-4 h-4"
                    data-testid={`check-${key}`}
                  />
                  <span className="text-sm text-charcoal capitalize">
                    {key.replaceAll('_', ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div>
            <h4 className="font-bold text-charcoal mb-3">Geo-tagged Photos</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              <input
                type="text"
                placeholder="Photo URL"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="input-field"
                data-testid="photo-url-input"
              />
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
            <button
              onClick={addPhoto}
              className="text-sm text-terracotta font-semibold hover:underline"
              data-testid="add-photo-btn"
            >
              + Add photo
            </button>

            {photos.length > 0 && (
              <ul className="mt-3 space-y-1" data-testid="photos-list">
                {photos.map((p, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between bg-sand-50 px-3 py-2 rounded text-sm"
                    data-testid={`photo-item-${idx}`}
                  >
                    <span className="truncate">
                      {p.photo_url} ({p.latitude.toFixed(4)}, {p.longitude.toFixed(4)})
                    </span>
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
              Video walkthrough URL (optional)
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
              Broker remarks (optional)
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

        <div className="sticky bottom-0 bg-white border-t border-sand-200 px-6 py-4 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-sand-300 text-charcoal hover:bg-sand-50"
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
