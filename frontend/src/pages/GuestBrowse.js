import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { propertyAPI } from '../services/api';
import { Building2, Search, Calendar, MapPin, Star } from 'lucide-react';

const GuestBrowse = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState({
    city: '',
    category: '',
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await propertyAPI.searchProperties(searchParams);
      setProperties(response.data.properties || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand-50">
      <header className="header-glass px-6 py-4" data-testid="guest-header">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-terracotta" />
            <h1 className="text-xl font-bold text-charcoal">PropNest</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-charcoal-light">Welcome, {user?.full_name}</span>
            <button
              onClick={() => navigate('/guest/bookings')}
              className="text-charcoal-light hover:text-terracotta"
            >
              My Bookings
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-4xl font-extrabold text-charcoal mb-8" data-testid="browse-title">
          Explore Properties
        </h2>

        {/* Search Bar */}
        <div className="dashboard-card mb-8" data-testid="search-filter">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search by city..."
              value={searchParams.city}
              onChange={(e) => setSearchParams({ ...searchParams, city: e.target.value })}
              className="input-field"
            />
            <select
              value={searchParams.category}
              onChange={(e) => setSearchParams({ ...searchParams, category: e.target.value })}
              className="input-field"
            >
              <option value="">All Categories</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="event_venue">Event Venues</option>
            </select>
            <button onClick={fetchProperties} className="btn-primary">
              <Search className="w-5 h-5 inline mr-2" />
              Search
            </button>
          </div>
        </div>

        {/* Properties Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-charcoal-light">Loading properties...</p>
          </div>
        ) : properties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="properties-grid">
            {properties.map((property) => (
              <div
                key={property.property_id}
                className="property-card cursor-pointer"
                onClick={() => navigate(`/property/${property.property_id}`)}
                data-testid={`property-${property.property_id}`}
              >
                <img
                  src={property.images[0] || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded'}
                  alt={property.title}
                  className="property-image"
                />
                <div className="p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-sage-dark">
                    {property.category}
                  </span>
                  <h3 className="text-lg font-bold text-charcoal mt-2 mb-1">{property.title}</h3>
                  <div className="flex items-center text-charcoal-light mb-3">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="text-sm">{property.city}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-terracotta">
                        ₹{property.price_per_night}
                      </span>
                      <span className="text-sm text-charcoal-light">/night</span>
                    </div>
                    <button className="text-terracotta font-semibold">View</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-charcoal-light">No properties found. Try adjusting your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestBrowse;
