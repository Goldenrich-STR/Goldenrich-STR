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
      { label: 'Bungalows', value: 'bungalow' },
      { label: 'Apartments', value: 'apartment' },
      { label: 'Studios', value: 'studio' },
      { label: 'Private Houses', value: 'independent_house' },
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
      { label: 'Meeting Rooms', value: 'meeting_room' },
      { label: 'Conference Rooms', value: 'conference_room' }
    ]
  },
  {
    key: 'event_venue',
    title: 'Event Venues',
    description: 'Banquet halls & hotel ballrooms.',
    icon: PartyPopper,
    color: 'text-gray-900 bg-gray-50 border border-gray-200',
    subtypes: [
      { label: 'Banquet Halls', value: 'banquet_hall' },
      { label: 'Hotel Ballrooms', value: 'hotel_ballroom' },
      { label: 'Wedding Venues', value: 'wedding_venue' }
    ]
  }
];

const LanguageSelector = ({ mode = 'dropdown', showPropertyTypes = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const closeTimerRef = useRef(null);
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
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const openDropdown = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    setIsOpen(true);
  };

  const closeDropdownWithDelay = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  if (!showPropertyTypes) {
    return null;
  }

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
          className="w-full flex items-center justify-between text-[17px] font-medium transition-colors duration-200 cursor-pointer bg-transparent border-none p-0 text-charcoal"
        >
          <span>Property Types</span>
          <ChevronDown 
            className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>

        {isOpen && (
          <div className="mt-4 w-full space-y-5 rounded-[20px] bg-[#faf7f2] border border-[#eee6d8] p-4">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.key} className="flex flex-col space-y-2">
                  <div 
                    onClick={() => handleCategoryClick(cat.key)}
                    className="flex items-center space-x-2.5 p-1 rounded-xl hover:bg-white cursor-pointer group/item transition-all duration-300 text-charcoal"
                  >
                    <Icon className="w-4 h-4 text-charcoal shrink-0" />
                    <h4 className="text-[15px] font-semibold text-charcoal group-hover/item:text-terracotta transition-colors">
                      {cat.title}
                    </h4>
                  </div>

                  <div className="flex flex-col space-y-2 pl-6">
                    {cat.subtypes.map((sub) => (
                      <button
                        key={sub.value}
                        onClick={() => handleSubtypeClick(cat.key, sub.value)}
                        className="w-full text-left text-[14px] font-medium text-gray-600 hover:text-terracotta transition-all duration-200"
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
    <div
      className="relative inline-block text-left"
      ref={dropdownRef}
      onMouseEnter={openDropdown}
      onMouseLeave={closeDropdownWithDelay}
    >
      <button
        type="button"
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
          } else {
            openDropdown();
          }
        }}
        className="flex items-center space-x-1 font-sans font-semibold text-[17px] tracking-tight hover:text-terracotta transition-colors duration-200 cursor-pointer group bg-transparent border-none p-0 text-inherit"
      >
        <span>Property Types</span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-[-5.5rem] md:-right-32 mt-3 w-[calc(100vw-2rem)] max-w-[95vw] md:w-[620px] max-h-[80vh] md:max-h-[none] overflow-y-auto md:overflow-y-visible rounded-[28px] bg-white border border-gray-200 shadow-elevated px-6 py-5 z-[999] origin-top-right animate-scale-up ring-1 ring-black/5 text-gray-900"
          onMouseEnter={openDropdown}
          onMouseLeave={closeDropdownWithDelay}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {CATEGORIES.map((cat) => {
              return (
                <div
                  key={cat.key}
                  className="flex flex-col px-4 md:px-5 py-2 first:pl-2 last:pr-2 md:border-r border-gray-200 last:border-r-0"
                >
                  <div 
                    onClick={() => handleCategoryClick(cat.key)}
                    className="text-left cursor-pointer group/item transition-all duration-200 text-gray-900 mb-3"
                  >
                    <h4 className="text-[13px] md:text-[15px] font-semibold text-gray-900 group-hover/item:text-terracotta transition-colors">
                      {cat.title}
                    </h4>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    {cat.subtypes.map((sub) => (
                      <button
                        key={sub.value}
                        onClick={() => handleSubtypeClick(cat.key, sub.value)}
                        className="w-full text-left py-0.5 text-[13px] md:text-[15px] font-medium text-gray-500 hover:text-terracotta transition-all duration-200"
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
