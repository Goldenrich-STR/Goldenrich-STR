import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check, Languages } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' }
];

const LanguageSelector = ({ currentLang, onLanguageChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  const selectedLang = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-white/80 hover:bg-white border border-gray-200 hover:border-terracotta rounded-full px-3.5 py-2 shadow-sm transition-all duration-300 cursor-pointer group"
      >
        <Globe className="w-3.5 h-3.5 text-charcoal-light group-hover:text-terracotta transition-colors" />
        <span className="text-[11px] font-semibold tracking-tight text-charcoal group-hover:text-terracotta transition-colors tracking-wide">
          {selectedLang.nativeLabel}
        </span>
        <ChevronDown 
          className={`w-3.5 h-3.5 text-charcoal-muted group-hover:text-terracotta transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-52 rounded-2xl bg-white/95 backdrop-blur-md border border-gray-100 shadow-elevated p-2 z-[999] origin-top-right animate-scale-up ring-1 ring-black/5">
          <div className="space-y-1">
            {LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentLang;
              return (
                <button
                  key={lang.code}
                  onClick={() => {
                    onLanguageChange(lang.code);
                    setIsOpen(false);
                  }}
                  className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-sm ${
                    isSelected
                      ? 'bg-terracotta/10 text-terracotta border border-terracotta/20'
                      : 'text-charcoal hover:bg-stone border border-transparent hover:border-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-1.5 rounded-lg transition-colors duration-300 ${isSelected ? 'bg-terracotta/20 text-terracotta' : 'bg-gray-50 text-charcoal-muted group-hover:bg-terracotta/10 group-hover:text-terracotta'}`}>
                      <Languages className="w-3.5 h-3.5" />
                    </div>
                    <span className="flex flex-col">
                      <span className="font-bold tracking-tight tracking-wide">{lang.nativeLabel}</span>
                      {lang.nativeLabel !== lang.label && (
                        <span className="text-[9px] font-bold text-charcoal-light group-hover:text-terracotta/70 transition-colors uppercase tracking-widest mt-0.5">{lang.label}</span>
                      )}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-terracotta/20 flex items-center justify-center animate-pulse">
                      <Check className="w-3 h-3 text-terracotta" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
