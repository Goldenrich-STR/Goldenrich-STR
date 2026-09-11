import React, { useState, useRef, useEffect } from 'react';
import { Smartphone, Download, QrCode, X } from 'lucide-react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.xspace360.app&pcampaignid=web_share';
const QR_CODE_API = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(PLAY_STORE_URL)}`;

export default function DownloadAppButton({ isNavScrolled = false, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Download App Trigger Button with APP badge */}
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          onMouseEnter={() => setIsOpen(true)}
          className={`flex items-center gap-2 rounded-full px-5 py-2.5 transition font-sans font-semibold text-[15px] md:text-[16px] tracking-tight shadow-sm border cursor-pointer ${
            isNavScrolled
              ? 'border-gray-300 text-charcoal bg-white hover:bg-gray-50 hover:border-gray-400'
              : 'border-white/40 text-white bg-white/10 backdrop-blur-md hover:bg-white/20'
          }`}
          aria-label="Download X-Space360 App"
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Download App</span>
        </button>

        {/* Pink/Red 'APP' Badge in top right corner */}
        <span className="absolute -top-2 -right-1 bg-[#FF4F6D] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-md pointer-events-none animate-pulse">
          APP
        </span>
      </div>

      {/* Floating QR Code Dropdown Card (StayVista style) */}
      {isOpen && (
        <div 
          onMouseLeave={() => setIsOpen(false)}
          className="absolute right-0 top-full mt-3 w-80 bg-white rounded-3xl p-5 shadow-[0_20px_50px_rgba(15,23,42,0.2)] border border-gray-150 z-50 text-left animate-fade-in"
        >
          {/* Top Caret Arrow Pointer */}
          <div className="absolute -top-2 right-10 w-4 h-4 bg-white rotate-45 border-t border-l border-gray-150" />

          <div className="relative z-10 flex items-start gap-4">
            {/* QR Code Scanner Box */}
            <div className="bg-gray-50 p-2 rounded-2xl border border-gray-100 shrink-0 flex flex-col items-center justify-center">
              <img
                src={QR_CODE_API}
                alt="Scan to Download X-Space360 App"
                className="w-24 h-24 object-contain rounded-xl"
              />
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Scan QR</span>
            </div>

            {/* Content & Action */}
            <div className="flex-1 flex flex-col justify-between h-full py-0.5">
              <div>
                <h4 className="text-base font-extrabold text-charcoal leading-tight tracking-tight">
                  X-Space360 App
                </h4>
                <p className="text-xs text-charcoal-muted font-medium mt-1 leading-snug">
                  Early access to luxury villas, venues & workspaces.
                </p>
              </div>

              {/* Direct Play Store Link Button */}
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="mt-3 inline-flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-full transition-all duration-200 shadow-md active:scale-95 group w-full text-center"
              >
                <Download className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                <span>Download App</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
