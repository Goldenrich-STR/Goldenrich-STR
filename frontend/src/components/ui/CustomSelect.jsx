import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select option',
  disabled = false,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  icon: Icon = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Normalize options array into [{ value, label }] format
  const normalizedOptions = options.map((opt) =>
    typeof opt === 'object' && opt !== null
      ? { value: opt.value, label: opt.label ?? opt.value }
      : { value: opt, label: opt }
  );

  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));

  const handleSelect = (val) => {
    if (disabled) return;
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block w-full text-left ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full bg-white border border-sand-200 hover:border-sand-400 focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 rounded-xl px-4 py-3 text-sm font-semibold text-charcoal flex items-center justify-between shadow-subtle transition-all duration-200 cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed ${
          isOpen ? 'border-terracotta ring-2 ring-terracotta/20 shadow-md' : ''
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          {Icon && <Icon className="w-4 h-4 text-slate-500 shrink-0" />}
          <span className={`truncate text-left ${!selectedOption && !value ? 'text-gray-600 font-bold' : ''}`}>
            {selectedOption ? selectedOption.label : value || placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-600 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-terracotta' : ''
          }`}
        />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-2 z-50 max-h-64 overflow-y-auto bg-white border border-sand-200 rounded-2xl shadow-elevated p-1.5 animate-fade-in custom-modal-scrollbar ${menuClassName}`}
        >
          {normalizedOptions.length === 0 ? (
            <div className="px-4 py-3 text-xs text-charcoal-muted font-medium text-center">
              No options available
            </div>
          ) : (
            normalizedOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-between cursor-pointer my-0.5 ${
                    isSelected
                      ? 'bg-[#FFF8E8] text-[#875F00] font-bold shadow-subtle'
                      : 'text-charcoal hover:bg-stone hover:text-charcoal'
                  }`}
                >
                  <span className="truncate pr-2">{opt.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-[#875F00] shrink-0 stroke-[2.5]" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
