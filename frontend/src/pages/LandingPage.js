import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Calendar, Star, Search } from 'lucide-react';
import { propertyAPI } from '../services/api';

const LandingPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('residential');

  const handleSearch = async () => {
    navigate(`/search?city=${searchQuery}&category=${selectedCategory}`);
  };

  const featuredProperties = [
    {
      id: 1,
      title: "Sunshine 2BHK Flat - Baner Pune",
      image: "https://images.unsplash.com/photo-1503174971373-b1f69850bded?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjBob3VzZSUyMGludGVyaW9yfGVufDB8fHx8MTc3ODA2MjA2Nnww&ixlib=rb-4.1.0&q=85",
      city: "Pune",
      price: 1800,
      rating: 4.8,
      category: "residential"
    },
    {
      id: 2,
      title: "Modern Office Space - Mumbai",
      image: "https://images.unsplash.com/photo-1633975846872-2bed7fd995f9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwzfHxjb21tZXJjaWFsJTIwb2ZmaWNlJTIwc3BhY2V8ZW58MHx8fHwxNzc4MDYyMDY2fDA&ixlib=rb-4.1.0&q=85",
      city: "Mumbai",
      price: 5500,
      rating: 4.9,
      category: "commercial"
    },
  ];

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Header */}
      <header className="header-glass sticky top-0 z-50 px-6 py-4" data-testid="landing-header">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Building2 className="w-8 h-8 text-terracotta" />
            <h1 className="text-2xl font-extrabold text-charcoal">PropNest</h1>
          </div>
          <nav className="flex items-center space-x-6">
            <button
              onClick={() => navigate('/login')}
              className="text-charcoal-light hover:text-terracotta font-medium transition"
              data-testid="login-btn"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/register')}
              className="btn-primary"
              data-testid="register-btn"
            >
              Get Started
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section
        className="relative h-[600px] flex items-center justify-center"
        style={{
          backgroundImage: 'url(https://static.prod-images.emergentagent.com/jobs/e7e29ee1-e615-4698-8be7-44fe5cb0ced0/images/7d9ef7248722c4a3a84b1cccacca4662dd8320cc1f76a512224be8fa721bd210.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        data-testid="hero-section"
      >
        <div className="absolute inset-0 bg-charcoal/50"></div>
        <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
          <h2 className="text-5xl lg:text-6xl font-extrabold text-white mb-6 tracking-tight">
            Find Your Perfect Space
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Residential, Commercial & Event Venues Across India
          </p>

          {/* Search Bar */}
          <div className="bg-white rounded-xl shadow-lg p-4 max-w-3xl mx-auto" data-testid="search-bar">
            <div className="flex flex-col md:flex-row gap-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input-field md:w-48"
                data-testid="category-selector"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="event_venue">Event Venues</option>
              </select>
              
              <input
                type="text"
                placeholder="Enter city or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field flex-1"
                data-testid="search-input"
              />
              
              <button
                onClick={handleSearch}
                className="btn-primary flex items-center justify-center space-x-2"
                data-testid="search-btn"
              >
                <Search className="w-5 h-5" />
                <span>Search</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="max-w-7xl mx-auto px-6 py-16" data-testid="featured-properties">
        <h3 className="text-4xl font-extrabold text-charcoal mb-8">Featured Properties</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredProperties.map((property) => (
            <div
              key={property.id}
              className="property-card cursor-pointer"
              onClick={() => navigate(`/property/${property.id}`)}
              data-testid={`property-card-${property.id}`}
            >
              <img
                src={property.image}
                alt={property.title}
                className="property-image"
              />
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-sage-dark">
                    {property.category}
                  </span>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-semibold">{property.rating}</span>
                  </div>
                </div>
                <h4 className="text-lg font-bold text-charcoal mb-2">{property.title}</h4>
                <div className="flex items-center text-charcoal-light mb-3">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span className="text-sm">{property.city}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold text-terracotta">₹{property.price}</span>
                    <span className="text-sm text-charcoal-light">/night</span>
                  </div>
                  <button className="text-terracotta font-semibold hover:underline">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-4xl font-extrabold text-charcoal mb-8 text-center">Explore by Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Residential', desc: 'Apartments, Villas, PG & Co-living', icon: Building2 },
              { title: 'Commercial', desc: 'Office Spaces & Co-working', icon: Building2 },
              { title: 'Event Venues', desc: 'Banquets, Farmhouses & Rooftops', icon: Calendar },
            ].map((category, idx) => (
              <div
                key={idx}
                className="dashboard-card text-center cursor-pointer"
                onClick={() => navigate('/search')}
                data-testid={`category-${idx}`}
              >
                <category.icon className="w-12 h-12 text-terracotta mx-auto mb-4" />
                <h4 className="text-xl font-bold text-charcoal mb-2">{category.title}</h4>
                <p className="text-charcoal-light">{category.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-terracotta py-16">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h3 className="text-4xl font-extrabold text-white mb-4">
            List Your Property on PropNest
          </h3>
          <p className="text-white/90 text-lg mb-8">
            Reach thousands of renters and maximize your property's potential
          </p>
          <button
            onClick={() => navigate('/register')}
            className="bg-white text-terracotta px-8 py-3 rounded-lg font-bold text-lg hover:bg-sand-50 transition"
            data-testid="list-property-cta"
          >
            Start Listing
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-charcoal text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Building2 className="w-6 h-6" />
                <h4 className="text-xl font-bold">PropNest</h4>
              </div>
              <p className="text-white/70">Your trusted partner for short-term rentals across India.</p>
            </div>
            <div>
              <h5 className="font-bold mb-4">For Guests</h5>
              <ul className="space-y-2 text-white/70">
                <li><a href="#" className="hover:text-white">Browse Properties</a></li>
                <li><a href="#" className="hover:text-white">How it Works</a></li>
                <li><a href="#" className="hover:text-white">FAQs</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">For Hosts</h5>
              <ul className="space-y-2 text-white/70">
                <li><a href="#" className="hover:text-white">List Property</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Resources</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">Company</h5>
              <ul className="space-y-2 text-white/70">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">Terms & Conditions</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/20 text-center text-white/70">
            <p>&copy; 2026 PropNest STR. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
