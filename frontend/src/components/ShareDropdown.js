import React, { useState, useEffect, useRef } from 'react';
import { Share2, Link, Check, Share } from 'lucide-react';
import { getPropertyPath } from '../lib/propertyRouting';

const ShareDropdown = ({ property, className = "", align = "right" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPropertyUrl = () => {
    return `${window.location.origin}${getPropertyPath(property)}`;
  };

  const getPrice = () => {
    return Math.round(Number(
      property.display_price_per_night ??
      property.customer_price_per_night ??
      property.price_per_night ??
      property.price ??
      0
    ));
  };

  const handleShareWhatsApp = (e) => {
    e.stopPropagation();
    const url = getPropertyUrl();
    const formattedPrice = getPrice().toLocaleString('en-IN');
    const cycle = property.category === 'commercial' || property.category === 'event_venue' ? 'day' : 'night';
    
    const text = `✨ *Check out this premium stay on X-Space360!* ✨\n\n` +
      `🏠 *${property.title}*\n` +
      `📍 *Location*: ${property.city}${property.state ? `, ${property.state}` : ''}\n` +
      `💰 *Price*: ₹${formattedPrice}/${cycle}\n` +
      `🛏️ *Capacity*: Up to ${property.max_guests || property.guests || 4} Guests\n\n` +
      `🔗 *View details and book here*:\n${url}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    setIsOpen(false);
  };

  const handleCopyLink = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(getPropertyUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleSystemShare = async (e) => {
    e.stopPropagation();
    const url = getPropertyUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: `Check out ${property.title} in ${property.city} on X-Space360`,
          url: url,
        });
      } catch (err) {
        console.log('System share dismissed or failed', err);
      }
    } else {
      // Fallback: Copy link
      handleCopyLink(e);
    }
    setIsOpen(false);
  };

  const canSystemShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className={`relative inline-block ${isOpen ? 'z-50' : ''}`} ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`w-8 h-8 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center shadow-subtle hover:bg-white hover:scale-[1.03] transition cursor-pointer text-charcoal hover:text-terracotta ${className}`}
        title="Share property"
      >
        <Share2 className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className={`absolute z-[100] mt-2 w-48 rounded-2xl bg-white p-2 shadow-xl border border-gray-100 animate-fade-in ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          <div className="text-[10px] font-bold text-gray-400 px-3 py-1 uppercase tracking-wider select-none">
            Share Options
          </div>
          
          <button
            onClick={handleShareWhatsApp}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-charcoal hover:bg-gray-50 rounded-xl transition-colors text-left"
          >
            {/* WhatsApp Logo SVG */}
            <svg className="w-4 h-4 text-green-650 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.417 9.864-9.864.002-2.639-1.026-5.12-2.892-6.988C16.578 1.888 14.1 .86 11.472.858c-5.438 0-9.862 4.416-9.867 9.864-.001 1.77.472 3.498 1.373 5.011l-.995 3.634 3.722-.975zm13.155-7.5c-.092-.153-.339-.244-.709-.43-3.7-.184-.43-.37-.615a1.29 1.29 0 0 0-.25-.339c-.198-.24-.785-1.017-.785-1.379 0-.361.185-.538.25-.615.066-.077.153-.153.245-.245.092-.092.126-.153.185-.258.058-.106.028-.2-.015-.285-.043-.092-.37-.914-.515-1.258-.142-.345-.285-.298-.387-.305-.1-.005-.213-.005-.327-.005-.114 0-.3.043-.456.215-.158.172-.601.587-.601 1.43 0 .843.615 1.658.702 1.772.088.114 1.21 1.849 2.932 2.593.41.177.729.283.979.362.413.131.789.112 1.085.068.33-.049 1.017-.415 1.159-.817.142-.4.142-.743.1-.817z"/>
            </svg>
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-charcoal hover:bg-gray-50 rounded-xl transition-colors text-left"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600 shrink-0" />
            ) : (
              <Link className="w-4 h-4 text-charcoal shrink-0" />
            )}
            <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
          </button>

          {canSystemShare && (
            <button
              onClick={handleSystemShare}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-charcoal hover:bg-gray-50 rounded-xl transition-colors text-left"
            >
              <Share className="w-4 h-4 text-charcoal shrink-0" />
              <span>More Options</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ShareDropdown;
