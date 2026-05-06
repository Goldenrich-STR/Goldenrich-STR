import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { propertyAPI } from '../services/api';
import { Building2, Plus, Calendar, DollarSign, Eye } from 'lucide-react';
import { NotificationBell } from '../components/NotificationCenter';

const HostDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHostProperties();
  }, []);

  const fetchHostProperties = async () => {
    try {
      const response = await propertyAPI.getHostProperties();
      setProperties(response.data.properties || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: 'Total Properties', value: properties.length, icon: Building2 },
    { label: 'Active Listings', value: properties.filter(p => p.status === 'live').length, icon: Eye },
    { label: 'Pending Review', value: properties.filter(p => p.status === 'pending_verification').length, icon: Calendar },
    { label: 'Total Earnings', value: '₹0', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-sand-50">
      <header className="header-glass px-6 py-4" data-testid="host-dashboard-header">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-terracotta" />
            <h1 className="text-xl font-bold text-charcoal">PropNest - Host Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <NotificationBell />
            <span className="text-charcoal-light">Welcome, {user?.full_name}</span>
            <button
              onClick={() => navigate('/host/calendar')}
              className="text-charcoal-light hover:text-terracotta"
              data-testid="nav-calendar-btn"
            >
              Calendar
            </button>
            <button
              onClick={() => navigate('/guest/bookings')}
              className="text-charcoal-light hover:text-terracotta"
            >
              My Bookings
            </button>
            <button onClick={logout} className="text-terracotta hover:underline">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-4xl font-extrabold text-charcoal" data-testid="dashboard-title">
            My Properties
          </h2>
          <button
            onClick={() => navigate('/host/create-property')}
            className="btn-primary flex items-center space-x-2"
            data-testid="create-property-btn"
          >
            <Plus className="w-5 h-5" />
            <span>Add Property</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8" data-testid="stats-grid">
          {stats.map((stat, idx) => (
            <div key={idx} className="dashboard-card" data-testid={`stat-${idx}`}>
              <stat.icon className="w-8 h-8 text-terracotta mb-3" />
              <p className="text-3xl font-bold text-charcoal">{stat.value}</p>
              <p className="text-sm text-charcoal-light mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Properties List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-charcoal-light">Loading properties...</p>
          </div>
        ) : properties.length > 0 ? (
          <div className="space-y-4" data-testid="properties-list">
            {properties.map((property) => (
              <div key={property.property_id} className="dashboard-card" data-testid={`property-${property.property_id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <img
                      src={property.images[0] || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded'}
                      alt={property.title}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <div>
                      <h3 className="text-lg font-bold text-charcoal">{property.title}</h3>
                      <p className="text-sm text-charcoal-light">{property.city}</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${
                        property.status === 'live' ? 'bg-green-100 text-green-700' :
                        property.status === 'pending_verification' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {property.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => navigate('/host/calendar')}
                      className="btn-secondary"
                      data-testid={`property-calendar-${property.property_id}`}
                    >
                      Calendar
                    </button>
                    <button
                      onClick={() => navigate(`/host/property/${property.property_id}`)}
                      className="btn-secondary"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 dashboard-card">
            <Building2 className="w-16 h-16 text-charcoal-light mx-auto mb-4" />
            <p className="text-charcoal-light mb-4">You haven't listed any properties yet.</p>
            <button
              onClick={() => navigate('/host/create-property')}
              className="btn-primary"
            >
              List Your First Property
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HostDashboard;
