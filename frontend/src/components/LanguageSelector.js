import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Briefcase, PartyPopper, ChevronDown, Layers } from 'lucide-react';

const CATEGORIES = [
  {
    key: 'residential',
    title: 'Residential Stays',
    description: 'Villas, apartments & holiday homes.',
    icon: Home,
    color: 'text-gray-900 bg-gray-50 border border-gray-200',
    subtypes: [
      { label: 'Villas', value: 'villa' },
      { label: 'Apartments', value: 'apartment' },
      { label: 'Studios', value: 'studio' },
      { label: 'Farmhouses', value: 'farmhouse' }
    ]
  },
  {
    key: 'commercial',
    title: 'Commercial Spaces',
    description: 'Offices, desks & meeting rooms.',
    icon: Briefcase,
    color: 'text-gray-900 bg-gray-50 border border-gray-200',
    subtypes: [
      { label: 'Private Offices', value: 'private_office' },
      { label: 'Co-working Desks', value: 'co_working' },
      { label: 'Meeting Rooms', value: 'meeting_room' }
    ]
  },
  {
    key: 'event_venue',
    title: 'Event Venues',
    description: 'Banquet halls, lawns & rooftops.',
    icon: PartyPopper,
    color: 'text-gray-900 bg-gray-50 border border-gray-200',
    subtypes: [
      { label: 'Banquet Halls', value: 'banquet_hall' },
      { label: 'Rooftops', value: 'rooftop' },
      { label: 'Hotel Ballrooms', value: 'hotel_ballroom' },
      { label: 'Resorts & Lawns', value: 'resort' }
    ]
  }
];

const LanguageSelector = ({ mode = 'dropdown' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCategoryClick = (categoryKey) => {
    navigate(`/guest/browse?category=${categoryKey}`);
    setIsOpen(false);
  };

  const handleSubtypeClick = (categoryKey, subtypeValue) => {
    navigate(`/guest/browse?category=${categoryKey}&property_type=${subtypeValue}`);
    setIsOpen(false);
  };

  if (mode === 'inline') {
    return (
      <div className="w-full text-left" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between py-2 text-2xl font-bold hover:text-terracotta transition-colors duration-200 cursor-pointer bg-transparent border-none p-0 text-inherit"
        >
          <span>Property Types</span>
          <ChevronDown 
            className={`w-6 h-6 transition-transform duration-300 ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>

        {isOpen && (
          <div className="mt-4 w-full space-y-6 text-gray-900 border-l border-sand-200 pl-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.key} className="flex flex-col space-y-2">
                  {/* Category Header */}
                  <div 
                    onClick={() => handleCategoryClick(cat.key)}
                    className="flex items-center space-x-2.5 p-1 rounded-xl hover:bg-stone/50 cursor-pointer group/item transition-all duration-300 text-gray-900"
                  >
                    <Icon className="w-4 h-4 text-terracotta shrink-0" />
                    <h4 className="text-sm font-extrabold text-gray-900 group-hover/item:text-terracotta transition-colors">
                      {cat.title}
                    </h4>
                  </div>

                  {/* Subtypes List */}
                  <div className="flex flex-col space-y-1 pl-6">
                    {cat.subtypes.map((sub) => (
                      <button
                        key={sub.value}
                        onClick={() => handleSubtypeClick(cat.key, sub.value)}
                        className="w-full text-left py-1.5 text-xs font-bold text-gray-600 hover:text-terracotta transition-all duration-200"
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 text-xs font-bold uppercase tracking-widest hover:text-terracotta transition-colors duration-200 cursor-pointer group bg-transparent border-none p-0 text-inherit"
      >
        <span>Property Types</span>
        <ChevronDown 
          className={`w-3.5 h-3.5 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {isOpen && (
        <div className="absolute right-[-5.5rem] md:-right-48 mt-3 w-[calc(100vw-2rem)] max-w-[95vw] md:w-[650px] max-h-[80vh] md:max-h-[none] overflow-y-auto md:overflow-y-visible rounded-3xl bg-white border border-gray-200 shadow-elevated p-6 z-[999] origin-top-right animate-scale-up ring-1 ring-black/5 text-gray-900">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.key} className="flex flex-col space-y-3">
                  {/* Category Header */}
                  <div 
                    onClick={() => handleCategoryClick(cat.key)}
                    className="flex items-start space-x-3 p-2 rounded-2xl hover:bg-stone/50 cursor-pointer group/item transition-all duration-300 text-gray-900"
                  >
                    <div className={`p-2.5 rounded-xl shrink-0 ${cat.color} transition-transform group-hover/item:scale-105 flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-gray-900" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-extrabold text-gray-900 group-hover/item:text-terracotta transition-colors">
                        {cat.title}
                      </h4>
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5 leading-tight">
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  <hr className="border-gray-100/85" />

                  {/* Subtypes List */}
                  <div className="flex flex-col space-y-1 pl-2">
                    {cat.subtypes.map((sub) => (
                      <button
                        key={sub.value}
                        onClick={() => handleSubtypeClick(cat.key, sub.value)}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-gray-700 hover:text-terracotta hover:bg-gray-50 rounded-xl transition-all duration-200"
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
