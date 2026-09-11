import React, { useState } from 'react';
import { Smartphone, CheckCircle2, Star, Zap, MapPin, QrCode, ExternalLink } from 'lucide-react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.xspace360.app&pcampaignid=web_share';
const QR_CODE_API = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(PLAY_STORE_URL)}`;

export default function AppPromoSection() {
  const [activeTab, setActiveTab] = useState('villas');

  return (
    <section className="w-full bg-[#F6F5F0] border-t border-b border-sand-200/80 py-10 sm:py-14 my-10 overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* ================= LEFT SIDE: REALISTIC IPHONE MOCKUP & SOFT BACKGROUND ================= */}
          <div className="lg:col-span-6 relative flex justify-center items-center py-4">
            
            {/* Soft decorative background circles (Nestaway style) */}
            <div className="absolute w-[320px] sm:w-[400px] h-[320px] sm:h-[400px] rounded-full bg-[#EAE5D9]/60 pointer-events-none -z-0" />
            <div className="absolute w-[240px] sm:w-[300px] h-[240px] sm:h-[300px] rounded-full bg-white/60 pointer-events-none -z-0 blur-xl" />

            {/* ── Real iPhone PNG Render Container ── */}
            <div className="relative w-[260px] sm:w-[295px] flex justify-center items-center z-10 group hover:scale-[1.01] transition-transform duration-500">
              
              {/* iPhone Mockup Outer Shell */}
              <div className="relative w-full h-[520px] sm:h-[570px] bg-black rounded-[46px] sm:rounded-[52px] p-3 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.22)] border-[3px] border-gray-800 shrink-0">
                
                {/* Dynamic Island Notch */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-22 h-4.5 bg-black rounded-full z-40 flex items-center justify-end px-2 gap-1 shadow-inner">
                  <div className="w-2 h-2 rounded-full bg-[#0a0a0f]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#12121a]" />
                </div>

                {/* iPhone Inner App Screen */}
                <div className="w-full h-full bg-[#FAF9F5] rounded-[38px] sm:rounded-[42px] overflow-hidden relative flex flex-col justify-between text-charcoal shadow-inner border border-black/10">
                  
                  {/* App Screen Header */}
                  <div className="bg-white px-4 pt-9 pb-2.5 border-b border-gray-100 text-left">
                    <div className="flex items-center justify-between mb-2">
                      <img src="/logo.png" alt="X-Space360" className="h-5 w-auto object-contain" />
                      <span className="bg-[#875F00] text-white text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        PRO
                      </span>
                    </div>

                    {/* App Search Bar inside phone screen */}
                    <div className="bg-stone/80 rounded-full px-3 py-1.5 flex items-center gap-2 border border-sand-200">
                      <MapPin className="w-3 h-3 text-[#875F00]" />
                      <span className="text-[10px] font-bold text-gray-500 truncate">Search luxury villas & venues...</span>
                    </div>
                  </div>

                  {/* App Screen Content Body */}
                  <div className="flex-1 p-3 overflow-hidden space-y-2.5 text-left bg-stone/30">
                    
                    {/* Category Filter Pills */}
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                      {['Villas', 'Commercial', 'Venues'].map((cat, i) => (
                        <span
                          key={cat}
                          onClick={() => setActiveTab(cat.toLowerCase())}
                          className={`text-[9px] font-bold px-3 py-1 rounded-full whitespace-nowrap cursor-pointer transition ${
                            i === 0 ? 'bg-charcoal text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-100'
                          }`}
                        >
                          {cat}
                        </span>
                      ))}
                    </div>

                    {/* Property Card 1 */}
                    <div className="bg-white rounded-2xl overflow-hidden border border-gray-150 shadow-subtle">
                      <div className="relative h-26 sm:h-28 bg-gray-200 overflow-hidden">
                        <img
                          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800"
                          alt="Elysium Glasshouse Villa"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 bg-black/80 text-[#D4AF37] px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
                          Signature Series
                        </div>
                        <div className="absolute bottom-2 right-2 bg-white/95 text-charcoal px-2 py-0.5 rounded-full text-[9px] font-extrabold shadow-sm">
                          ⭐ 4.98
                        </div>
                      </div>
                      <div className="p-2.5">
                        <h6 className="font-bold text-[11px] text-charcoal truncate">Elysium Glasshouse Villa</h6>
                        <p className="text-[9px] text-gray-500 font-semibold truncate">Nashik Hills · Private Pool</p>
                        <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-charcoal">₹12,500 <span className="text-[8px] font-normal text-gray-500">/night</span></span>
                          <span className="bg-emerald-50 text-emerald-700 text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5 fill-current" /> Instant
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Property Card 2 */}
                    <div className="bg-white rounded-2xl p-2.5 border border-gray-150 shadow-subtle flex items-center gap-2.5">
                      <img
                        src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=400"
                        alt="Royal Lakefront Estate"
                        className="w-12 h-12 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h6 className="font-bold text-[10px] text-charcoal truncate">Royal Lakefront Estate</h6>
                        <p className="text-[8px] text-gray-500 font-medium truncate">Udaipur · 5 BHK Villa</p>
                        <span className="text-[10px] font-extrabold text-charcoal mt-0.5 block">₹18,000 /night</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom App Bar */}
                  <div className="bg-white py-2 px-4 border-t border-gray-100 flex justify-between items-center text-[8px] font-bold text-gray-400">
                    <div className="flex flex-col items-center text-[#875F00]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#875F00] mb-0.5" />
                      <span>Discover</span>
                    </div>
                    <div className="flex flex-col items-center"><span>Explore</span></div>
                    <div className="flex flex-col items-center"><span>Wishlist</span></div>
                    <div className="flex flex-col items-center"><span>Bookings</span></div>
                  </div>

                </div>
              </div>
            </div>

          </div>

          {/* ================= RIGHT SIDE: CLEAN SIMPLE SANS FONT & STORE DOWNLOADS ================= */}
          <div className="lg:col-span-6 text-left space-y-5 lg:pl-4">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-sand-300 text-[#875F00] text-[11px] font-extrabold uppercase tracking-[0.18em] shadow-subtle">
              <Smartphone className="w-3.5 h-3.5 text-[#875F00]" />
              <span>OFFICIAL MOBILE APP</span>
            </div>

            {/* Title - Clean Simple Sans-Serif Typography */}
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-charcoal tracking-tight leading-[1.16] font-sans">
              Start Your Next Chapter with X-Space360
            </h2>

            {/* Description */}
            <p className="text-charcoal-muted text-sm sm:text-base font-medium leading-relaxed max-w-xl">
              Your journey to hassle-free luxury stays begins here. Download the X-Space360 app to discover handpicked villas, co-working spaces, and event venues with direct host connectivity.
            </p>

            {/* Feature Bullets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {[
                'Exclusive app-only deals up to 30%',
                'Direct host contact & instant chat',
                '100% verified properties & pricing',
                '24/7 dedicated concierge care'
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-charcoal">
                  <CheckCircle2 className="w-4 h-4 text-[#875F00] shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {/* ── STORE DOWNLOAD BUTTONS & CLICKABLE QR SCANNER ROW ── */}
            <div className="pt-5 border-t border-sand-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-5">
              
              {/* Clickable QR Code Scanner Box */}
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white p-3 rounded-2xl border border-sand-200 shadow-subtle flex items-center gap-3.5 group cursor-pointer hover:border-sand-400 hover:shadow-md transition-all duration-200 shrink-0"
                title="Click to open Play Store link"
              >
                <div className="relative bg-stone/60 p-1 rounded-xl border border-sand-200 shrink-0 overflow-hidden">
                  <img
                    src={QR_CODE_API}
                    alt="Scan QR code to Download X-Space360 App"
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ExternalLink className="w-4 h-4 text-charcoal bg-white rounded-full p-0.5 shadow" />
                  </div>
                </div>
                <div className="text-left pr-2">
                  <div className="flex items-center gap-1 text-[9px] font-extrabold text-[#875F00] uppercase tracking-widest">
                    <QrCode className="w-3 h-3" />
                    <span>SCAN TO DOWNLOAD</span>
                  </div>
                  <h5 className="text-xs sm:text-sm font-bold text-charcoal mt-0.5 leading-tight group-hover:text-[#875F00] transition-colors">
                    Scan with Phone
                  </h5>
                  <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                    Opens Play Store directly
                  </p>
                </div>
              </a>

              {/* Store Download Buttons */}
              <div className="flex flex-row sm:flex-col gap-2.5 shrink-0 justify-center">
                
                {/* Google Play Button */}
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial bg-charcoal hover:bg-black text-white border border-charcoal rounded-xl px-5 py-2.5 flex items-center gap-3 transition-all duration-200 shadow-subtle hover:scale-[1.02] active:scale-95 group"
                >
                  <svg className="w-5 h-5 fill-current text-white shrink-0" viewBox="0 0 24 24">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a1.492 1.492 0 0 1-.61-.954V2.768c0-.368.22-.725.609-.954zm11.3 9.072l2.366-2.366 3.684 2.1c.905.516.905 1.354 0 1.87l-3.684 2.1-2.366-2.366zm-1.118 1.118L4.693 21.096l10.2-5.836-1.102-1.256zm0-2.008l1.102-1.256L4.693 2.904l9.098 9.098z"/>
                  </svg>
                  <div className="text-left">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none">Get it on</p>
                    <p className="text-xs font-black text-white tracking-tight leading-none mt-1 group-hover:text-[#D4AF37] transition-colors">Google Play</p>
                  </div>
                </a>

                {/* App Store Button */}
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial bg-charcoal hover:bg-black text-white border border-charcoal rounded-xl px-5 py-2.5 flex items-center gap-3 transition-all duration-200 shadow-subtle hover:scale-[1.02] active:scale-95 group"
                >
                  <svg className="w-5 h-5 fill-current text-white shrink-0" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.31c.67-.82 1.13-1.96.99-3.11-.98.04-2.19.66-2.88 1.47-.62.72-1.16 1.89-.99 3.01 1.1.09 2.21-.55 2.88-1.37z"/>
                  </svg>
                  <div className="text-left">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none">Download on the</p>
                    <p className="text-xs font-black text-white tracking-tight leading-none mt-1 group-hover:text-[#D4AF37] transition-colors">App Store</p>
                  </div>
                </a>

              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
