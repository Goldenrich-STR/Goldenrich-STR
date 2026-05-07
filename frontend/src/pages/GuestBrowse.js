import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../contexts/AuthContext';
import { propertyAPI } from '../services/api';
import {
  Building2,
  Search,
  MapPin,
  SlidersHorizontal,
  X,
  LayoutGrid,
  Map as MapIcon,
  Columns,
  ZapOff,
  Zap,
} from 'lucide-react';

// Fix Leaflet default marker icon for webpack/CRA
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const PROPERTY_TYPES = [
  { value: '', label: 'Any type' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
  { value: 'studio', label: 'Studio' },
  { value: 'independent_house', label: 'Independent House' },
  { value: 'pg', label: 'PG' },
  { value: 'co_living', label: 'Co-living' },
  { value: 'private_office', label: 'Private Office' },
  { value: 'co_working', label: 'Co-working' },
  { value: 'meeting_room', label: 'Meeting Room' },
  { value: 'banquet_hall', label: 'Banquet Hall' },
  { value: 'farmhouse', label: 'Farmhouse' },
  { value: 'rooftop', label: 'Rooftop' },
  { value: 'hotel_ballroom', label: 'Hotel Ballroom' },
];

const BHK_TYPES = [
  { value: '', label: 'Any size' },
  { value: 'studio', label: 'Studio' },
  { value: '1bhk', label: '1 BHK' },
  { value: '2bhk', label: '2 BHK' },
  { value: '3bhk', label: '3 BHK' },
  { value: '4bhk', label: '4 BHK' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'banquet', label: 'Banquet' },
];

const AMENITY_OPTIONS = [
  'wifi', 'ac', 'parking', 'kitchen', 'pool', 'gym', 'tv',
  'fireplace', 'rooftop', 'bar', 'av_system', 'stage', 'catering',
  'coffee', 'printer', 'restrooms',
];

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
];

const VIEW_MODES = {
  GRID: 'grid',
  SPLIT: 'split',
  MAP: 'map',
};

// Custom price-pin icon factory
function priceIcon(price, active) {
  const html = `
    <div style="
      background:${active ? '#C05C4F' : '#fff'};
      color:${active ? '#fff' : '#2C2C2C'};
      border:2px solid #C05C4F;
      padding:4px 10px;
      border-radius:999px;
      font-weight:700;
      font-size:12px;
      white-space:nowrap;
      box-shadow:0 2px 8px rgba(0,0,0,0.15);
      font-family:'Manrope',sans-serif;
    ">₹${price}</div>
  `;
  return L.divIcon({
    html,
    className: 'price-pin',
    iconSize: [60, 28],
    iconAnchor: [30, 14],
  });
}

// Centers the map on bounds of properties
function FitBounds({ properties }) {
  const map = useMap();
  useEffect(() => {
    const withCoords = properties.filter((p) => p.latitude && p.longitude);
    if (!withCoords.length) return;
    if (withCoords.length === 1) {
      map.setView([withCoords[0].latitude, withCoords[0].longitude], 11);
      return;
    }
    const bounds = L.latLngBounds(withCoords.map((p) => [p.latitude, p.longitude]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [properties, map]);
  return null;
}

const GuestBrowse = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState(VIEW_MODES.GRID);
  const [hoveredId, setHoveredId] = useState(null);

  const [filters, setFilters] = useState({
    city: '',
    category: '',
    property_type: '',
    bhk_type: '',
    min_price: '',
    max_price: '',
    instant_booking: false,
    pet_friendly: false,
    check_in: '',
    check_out: '',
    sort: 'recommended',
    amenities: [],
  });

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.sort]);

  const buildParams = () => {
    const params = {};
    if (filters.city) params.city = filters.city;
    if (filters.category) params.category = filters.category;
    if (filters.property_type) params.property_type = filters.property_type;
    if (filters.bhk_type) params.bhk_type = filters.bhk_type;
    if (filters.min_price) params.min_price = Number(filters.min_price);
    if (filters.max_price) params.max_price = Number(filters.max_price);
    if (filters.instant_booking) params.instant_booking = true;
    if (filters.pet_friendly) params.pet_friendly = true;
    if (filters.check_in) params.check_in = filters.check_in;
    if (filters.check_out) params.check_out = filters.check_out;
    if (filters.amenities.length) params.amenities = filters.amenities.join(',');
    if (filters.sort) params.sort = filters.sort;
    return params;
  };

  const fetchProperties = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await propertyAPI.searchProperties(buildParams());
      setProperties(res.data.properties || []);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.detail || 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const toggleAmenity = (a) => {
    setFilters((f) => {
      const has = f.amenities.includes(a);
      return { ...f, amenities: has ? f.amenities.filter((x) => x !== a) : [...f.amenities, a] };
    });
  };

  const clearFilters = () => {
    setFilters({
      city: '',
      category: '',
      property_type: '',
      bhk_type: '',
      min_price: '',
      max_price: '',
      instant_booking: false,
      pet_friendly: false,
      check_in: '',
      check_out: '',
      sort: 'recommended',
      amenities: [],
    });
  };

  const handleSearch = (e) => {
    e?.preventDefault();
    fetchProperties();
  };

  const propsWithCoords = useMemo(
    () => properties.filter((p) => p.latitude && p.longitude),
    [properties]
  );

  const indiaCenter = [20.5937, 78.9629];

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col">
      {/* Header */}
      <header className="header-glass px-6 py-4" data-testid="guest-header">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-terracotta" />
            <h1 className="text-xl font-bold text-charcoal">Golden-X-Host</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-charcoal-light hidden sm:inline">Welcome, {user?.full_name}</span>
            <button
              onClick={() => navigate('/guest/bookings')}
              className="text-charcoal-light hover:text-terracotta"
              data-testid="my-bookings-link"
            >
              My Bookings
            </button>
            <button onClick={logout} className="text-terracotta hover:underline">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Top Search Bar */}
      <div className="bg-white border-b border-sand-200 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto">
          <form
            onSubmit={handleSearch}
            className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-end"
            data-testid="search-bar"
          >
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-charcoal-light">Where</label>
                <input
                  type="text"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  placeholder="City e.g. Goa"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  data-testid="search-city-input"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-charcoal-light">Check-in</label>
                <input
                  type="date"
                  value={filters.check_in}
                  onChange={(e) => setFilters({ ...filters, check_in: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  data-testid="search-checkin-input"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-charcoal-light">Check-out</label>
                <input
                  type="date"
                  value={filters.check_out}
                  onChange={(e) => setFilters({ ...filters, check_out: e.target.value })}
                  min={filters.check_in || undefined}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  data-testid="search-checkout-input"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-charcoal-light">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                  data-testid="search-category-select"
                >
                  <option value="">Any</option>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="event_venue">Event Venue</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className="btn-secondary flex items-center space-x-2"
                data-testid="toggle-filters-btn"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
                {(filters.amenities.length > 0 ||
                  filters.property_type ||
                  filters.bhk_type ||
                  filters.min_price ||
                  filters.max_price ||
                  filters.instant_booking ||
                  filters.pet_friendly) && (
                  <span className="bg-terracotta text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    !
                  </span>
                )}
              </button>
              <button
                type="submit"
                className="btn-primary flex items-center space-x-2"
                data-testid="search-submit-btn"
              >
                <Search className="w-4 h-4" />
                <span>Search</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Advanced filters drawer */}
      {showFilters && (
        <div className="bg-white border-b border-sand-200 px-6 py-4" data-testid="advanced-filters">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-charcoal-light">Property Type</label>
              <select
                value={filters.property_type}
                onChange={(e) => setFilters({ ...filters, property_type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white mt-1"
                data-testid="filter-property-type"
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-charcoal-light">BHK / Size</label>
              <select
                value={filters.bhk_type}
                onChange={(e) => setFilters({ ...filters, bhk_type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white mt-1"
                data-testid="filter-bhk-type"
              >
                {BHK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-charcoal-light">Min Price (₹/night)</label>
              <input
                type="number"
                value={filters.min_price}
                onChange={(e) => setFilters({ ...filters, min_price: e.target.value })}
                placeholder="0"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                data-testid="filter-min-price"
              />
            </div>
            <div>
              <label className="text-xs text-charcoal-light">Max Price (₹/night)</label>
              <input
                type="number"
                value={filters.max_price}
                onChange={(e) => setFilters({ ...filters, max_price: e.target.value })}
                placeholder="50000"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                data-testid="filter-max-price"
              />
            </div>

            <div className="md:col-span-4">
              <label className="text-xs text-charcoal-light">Amenities</label>
              <div className="flex flex-wrap gap-2 mt-1" data-testid="amenities-list">
                {AMENITY_OPTIONS.map((a) => {
                  const active = filters.amenities.includes(a);
                  return (
                    <button
                      type="button"
                      key={a}
                      onClick={() => toggleAmenity(a)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${
                        active
                          ? 'bg-terracotta text-white border-terracotta'
                          : 'bg-white text-charcoal border-sand-300 hover:border-terracotta'
                      }`}
                      data-testid={`amenity-${a}`}
                    >
                      {a.replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-4 flex flex-wrap items-center gap-4">
              <label className="flex items-center space-x-2 text-sm text-charcoal" data-testid="filter-instant-toggle">
                <input
                  type="checkbox"
                  checked={filters.instant_booking}
                  onChange={(e) => setFilters({ ...filters, instant_booking: e.target.checked })}
                />
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Instant booking only</span>
              </label>
              <label className="flex items-center space-x-2 text-sm text-charcoal" data-testid="filter-pet-toggle">
                <input
                  type="checkbox"
                  checked={filters.pet_friendly}
                  onChange={(e) => setFilters({ ...filters, pet_friendly: e.target.checked })}
                />
                <span>🐾 Pet-friendly</span>
              </label>
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-terracotta hover:underline ml-auto flex items-center space-x-1"
                data-testid="clear-filters-btn"
              >
                <X className="w-4 h-4" />
                <span>Clear all</span>
              </button>
              <button
                type="button"
                onClick={handleSearch}
                className="btn-primary text-sm"
                data-testid="apply-filters-btn"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results header: count + sort + view toggle */}
      <div className="px-6 py-4 max-w-7xl mx-auto w-full flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="text-charcoal" data-testid="results-count">
          {loading ? 'Searching…' : (
            <>
              <span className="font-bold">{properties.length}</span> stay
              {properties.length === 1 ? '' : 's'} found
              {filters.check_in && filters.check_out && (
                <span className="text-charcoal-light text-sm ml-2">
                  · available {filters.check_in} → {filters.check_out}
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
            data-testid="sort-select"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <div className="flex border rounded-lg overflow-hidden" data-testid="view-toggle">
            <button
              type="button"
              onClick={() => setViewMode(VIEW_MODES.GRID)}
              className={`px-3 py-2 text-sm flex items-center space-x-1 ${
                viewMode === VIEW_MODES.GRID ? 'bg-terracotta text-white' : 'bg-white text-charcoal'
              }`}
              data-testid="view-grid-btn"
              title="Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode(VIEW_MODES.SPLIT)}
              className={`px-3 py-2 text-sm flex items-center space-x-1 border-l ${
                viewMode === VIEW_MODES.SPLIT ? 'bg-terracotta text-white' : 'bg-white text-charcoal'
              }`}
              data-testid="view-split-btn"
              title="Split"
            >
              <Columns className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode(VIEW_MODES.MAP)}
              className={`px-3 py-2 text-sm flex items-center space-x-1 border-l ${
                viewMode === VIEW_MODES.MAP ? 'bg-terracotta text-white' : 'bg-white text-charcoal'
              }`}
              data-testid="view-map-btn"
              title="Map"
            >
              <MapIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="px-6 max-w-7xl mx-auto w-full">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4" data-testid="search-error">
            {error}
          </div>
        </div>
      )}

      {/* Results body */}
      <div className="flex-1 px-6 pb-8 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="text-center py-16 text-charcoal-light">Loading…</div>
        ) : properties.length === 0 ? (
          <div className="text-center py-16 dashboard-card" data-testid="empty-results">
            <Building2 className="w-16 h-16 text-charcoal-light mx-auto mb-4" />
            <p className="text-charcoal-light mb-4">No properties match your filters.</p>
            <button onClick={clearFilters} className="btn-secondary">Reset filters</button>
          </div>
        ) : (
          <div
            className={
              viewMode === VIEW_MODES.SPLIT
                ? 'grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-280px)]'
                : viewMode === VIEW_MODES.MAP
                ? 'h-[calc(100vh-280px)]'
                : ''
            }
          >
            {/* Cards */}
            {viewMode !== VIEW_MODES.MAP && (
              <div
                className={
                  viewMode === VIEW_MODES.SPLIT
                    ? 'overflow-y-auto pr-2 space-y-4'
                    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                }
                data-testid="properties-grid"
              >
                {properties.map((p) => (
                  <PropertyCard
                    key={p.property_id}
                    property={p}
                    compact={viewMode === VIEW_MODES.SPLIT}
                    onHover={setHoveredId}
                    onClick={() => navigate(`/property/${p.property_id}`)}
                  />
                ))}
              </div>
            )}

            {/* Map */}
            {(viewMode === VIEW_MODES.SPLIT || viewMode === VIEW_MODES.MAP) && (
              <div className="rounded-xl overflow-hidden border border-sand-200 h-full" data-testid="results-map">
                <MapContainer
                  center={indiaCenter}
                  zoom={5}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <FitBounds properties={propsWithCoords} />
                  {propsWithCoords.map((p) => (
                    <Marker
                      key={p.property_id}
                      position={[p.latitude, p.longitude]}
                      icon={priceIcon(p.price_per_night, hoveredId === p.property_id)}
                      eventHandlers={{
                        click: () => navigate(`/property/${p.property_id}`),
                        mouseover: () => setHoveredId(p.property_id),
                        mouseout: () => setHoveredId(null),
                      }}
                    >
                      <Popup>
                        <div className="text-sm" style={{ minWidth: 180 }}>
                          <strong>{p.title}</strong>
                          <div>{p.city}</div>
                          <div className="text-terracotta font-bold mt-1">
                            ₹{p.price_per_night}/night
                          </div>
                          <button
                            onClick={() => navigate(`/property/${p.property_id}`)}
                            className="text-terracotta underline mt-1 text-xs"
                          >
                            View details
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const PropertyCard = ({ property, compact, onHover, onClick }) => (
  <div
    className={`property-card cursor-pointer ${compact ? 'flex' : ''}`}
    onClick={onClick}
    onMouseEnter={() => onHover && onHover(property.property_id)}
    onMouseLeave={() => onHover && onHover(null)}
    data-testid={`property-${property.property_id}`}
  >
    <img
      src={property.images?.[0] || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=800'}
      alt={property.title}
      className={compact ? 'w-40 h-32 object-cover flex-shrink-0' : 'property-image'}
    />
    <div className="p-4 flex-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-sage-dark">
          {property.category?.replace('_', ' ')}
        </span>
        {property.instant_booking ? (
          <span className="text-xs flex items-center text-amber-600" title="Instant booking">
            <Zap className="w-3 h-3 mr-0.5" /> Instant
          </span>
        ) : (
          <span className="text-xs flex items-center text-charcoal-light" title="Request to book">
            <ZapOff className="w-3 h-3 mr-0.5" />
          </span>
        )}
      </div>
      <h3 className="text-base font-bold text-charcoal mt-1 mb-1 line-clamp-1">{property.title}</h3>
      <div className="flex items-center text-charcoal-light mb-2">
        <MapPin className="w-4 h-4 mr-1" />
        <span className="text-sm">{property.city}, {property.state}</span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xl font-bold text-terracotta">
            ₹{property.price_per_night}
          </span>
          <span className="text-sm text-charcoal-light">/night</span>
        </div>
        <button className="text-terracotta font-semibold text-sm">View</button>
      </div>
    </div>
  </div>
);

export default GuestBrowse;
