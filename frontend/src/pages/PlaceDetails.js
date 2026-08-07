import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getPlaceBySlug } from '../data/placesToVisit';
import { ArrowLeft, MapPin, Calendar, Star, Map } from 'lucide-react';
import SEO from '../components/SEO';

const PROPERTY_IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80';
const getImageUrl = (url) => {
  if (!url) return PROPERTY_IMAGE_FALLBACK;
  if (url.startsWith('http')) {
    // Proxy external images to bypass hotlink protection (403 forbidden)
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
  }
  return `${process.env.REACT_APP_API_URL || 'http://localhost:8001'}${url}`;
};

const PlaceDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const place = getPlaceBySlug(slug);
  
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!place) return;
    const fetchProperties = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:8001'}/api/properties/search`, {
          params: { ...place.searchQuery, limit: 12 }
        });
        setProperties(response.data.properties || []);
      } catch (err) {
        console.error('Failed to fetch nearby properties:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, [place]);

  if (!place) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Location Not Found</h1>
        <button 
          onClick={() => navigate('/')} 
          className="px-6 py-2 bg-charcoal text-white rounded-lg font-medium hover:bg-black transition"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone/30">
      <SEO title={`${place.title} - Places to Visit`} description={place.description} />
      
      {/* Hero Section */}
      <div className="relative h-[60vh] min-h-[400px] w-full bg-charcoal flex items-end pb-12">
        <div className="absolute inset-0">
          <img 
            src={getImageUrl(place.heroImage)} 
            alt={place.title} 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <button 
            onClick={() => navigate('/')}
            className="mb-6 flex items-center text-white/80 hover:text-white transition gap-2 group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Home</span>
          </button>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-2 tracking-tight">
            {place.title}
          </h1>
          <p className="text-xl md:text-2xl text-white/90 font-light max-w-2xl">
            {place.subtitle}
          </p>
        </div>
      </div>

      {/* Info Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-elevated border border-white p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <h2 className="text-2xl font-bold text-charcoal mb-4">About {place.title}</h2>
              <p className="text-gray-600 leading-relaxed text-lg">
                {place.description}
              </p>
              
              <div className="mt-8">
                <h3 className="font-bold text-charcoal mb-4 flex items-center gap-2">
                  <Star size={20} className="text-gold" /> Key Highlights
                </h3>
                <div className="flex flex-wrap gap-3">
                  {place.highlights.map((highlight, idx) => (
                    <span key={idx} className="px-4 py-2 bg-stone rounded-full text-sm font-medium text-charcoal border border-gray-100">
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-stone/50 p-6 rounded-xl border border-gray-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-subtle text-gold">
                    <Map size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Distance from Nashik</p>
                    <p className="font-bold text-charcoal text-lg">{place.distanceFromNashik}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-subtle text-gold">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Best Time to Visit</p>
                    <p className="font-bold text-charcoal text-lg">{place.bestTime}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Properties Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-charcoal">
            Properties Near {place.title}
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white rounded-xl aspect-[16/10] animate-pulse" />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-100 shadow-subtle">
            <MapPin size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-charcoal mb-2">No properties found</h3>
            <p className="text-gray-500">We couldn't find any properties listed right near {place.title} at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {properties.map((item, index) => (
              <button
                key={item.property_id || index}
                type="button"
                onClick={() => navigate(`/property/${item.property_id}`)}
                className="w-full bg-white rounded-xl overflow-hidden border border-gray-100 shadow-subtle hover:shadow-elevated transition text-left flex flex-col group"
              >
                <div className="relative aspect-[16/10] bg-stone overflow-hidden">
                  <img
                    src={item.img || getImageUrl(item.images?.[0]) || PROPERTY_IMAGE_FALLBACK}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                    onError={({ currentTarget }) => {
                      currentTarget.onerror = null;
                      currentTarget.src = PROPERTY_IMAGE_FALLBACK;
                    }}
                  />
                  <div className="absolute top-3 left-3 flex gap-2 z-20">
                    {item.rating > 0 && item.review_count > 0 && (
                      <div className="bg-charcoal/70 backdrop-blur-sm text-white rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1">
                        <span>{Number(item.rating).toFixed(1)}</span>
                        <Star size={10} className="fill-current" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <div className="flex justify-between items-start gap-4 mb-1">
                    <h3 className="font-bold text-charcoal line-clamp-1">{item.title}</h3>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-1 mb-2">
                    {item.city}{item.state ? `, ${item.state}` : ''}
                  </p>
                  <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-end">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
                        {item.category === 'commercial' ? 'Monthly' : 'Per Night'}
                      </p>
                      <p className="font-bold text-charcoal text-lg">
                        ₹{Number(item.display_price_per_night ?? item.customer_price_per_night ?? item.price_per_night ?? item.price ?? 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaceDetails;
