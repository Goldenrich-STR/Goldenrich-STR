import React, { useState } from 'react';
import { Smartphone, CheckCircle2, Star, Zap, MapPin, QrCode, ExternalLink } from 'lucide-react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.xspace360.app&pcampaignid=web_share';
const QR_CODE_API = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(PLAY_STORE_URL)}`;

export default function AppPromoSection() {
  const [activeTab, setActiveTab] = useState('villas');

  return (
    <section className="w-full bg-[#F6F5F0] border-t border-b border-sand-200/80 py-6 sm:py-8 my-4 overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
          
          {/* ================= LEFT SIDE: REALISTIC IPHONE MOCKUP & SOFT BACKGROUND ================= */}
          <div className="lg:col-span-6 relative flex justify-center items-center py-2">
            
            {/* Soft decorative background circles */}
            <div className="absolute w-[280px] sm:w-[360px] h-[280px] sm:h-[360px] rounded-full bg-[#EAE5D9]/60 pointer-events-none -z-0" />
            <div className="absolute w-[220px] sm:w-[270px] h-[220px] sm:h-[270px] rounded-full bg-white/60 pointer-events-none -z-0 blur-xl" />

            {/* Slim Profile Phone Frame */}
            <div className="relative w-[260px] sm:w-[280px] flex justify-center items-center z-10 group hover:scale-[1.01] transition-transform duration-500">
              
              {/* Phone Frame Body */}
              <div className="relative w-full h-[510px] sm:h-[550px] bg-[#121215] rounded-[42px] sm:rounded-[48px] p-2.5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border-[2.5px] border-[#3a3840] shrink-0 overflow-hidden">
                
                {/* Hardware Side Volume Buttons */}
                <div className="absolute -left-[1.5px] top-24 w-[2px] h-7 bg-[#48474e] rounded-l-sm" />
                <div className="absolute -left-[1.5px] top-34 w-[2px] h-10 bg-[#48474e] rounded-l-sm" />
                <div className="absolute -right-[1.5px] top-30 w-[2px] h-14 bg-[#48474e] rounded-r-sm" />

                {/* iPhone Inner App Screen */}
                <div className="w-full h-full bg-[#FAF9F5] rounded-[34px] sm:rounded-[40px] overflow-hidden relative flex flex-col justify-between text-charcoal">
                  
                  {/* Status Bar & Punchhole */}
                  <div className="bg-white px-5 pt-2.5 pb-1 flex items-center justify-between text-[9px] font-bold text-gray-800">
                    <span>9:41</span>
                    <div className="w-3.5 h-3.5 rounded-full bg-black flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#12121a]" />
                    </div>
                    <div className="flex items-center gap-1 text-[8px]">
                      <span>5G</span>
                      <div className="w-3 h-1.5 border border-black rounded-xs p-0.5 flex items-center">
                        <div className="w-full h-full bg-black" />
                      </div>
                    </div>
                  </div>

                  {/* App Screen Header */}
                  <div className="bg-white px-3.5 py-2 border-b border-gray-100 text-left">
                    <div className="flex items-center justify-between mb-1.5">
                      <img src="/logo.png" alt="X-Space360" className="h-4.5 max-w-[130px] object-contain" />
                      <span className="bg-[#875F00] text-white text-[7px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                        PRO
                      </span>
                    </div>

                    {/* App Search Bar inside phone screen */}
                    <div className="bg-stone/80 rounded-full px-2.5 py-1 flex items-center gap-1.5 border border-sand-200">
                      <MapPin className="w-2.5 h-2.5 text-[#875F00]" />
                      <span className="text-[8.5px] font-bold text-gray-500 truncate">Search luxury villas &amp; venues...</span>
                    </div>
                  </div>

                  {/* App Screen Content Body */}
                  <div className="flex-1 p-2.5 overflow-hidden space-y-2 text-left bg-stone/30">
                    
                    {/* Category Filter Pills */}
                    <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5">
                      {['Villas', 'Commercial', 'Venues'].map((cat, i) => (
                        <span
                          key={cat}
                          onClick={() => setActiveTab(cat.toLowerCase())}
                          className={`text-[8.5px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap cursor-pointer transition ${
                            i === 0 ? 'bg-charcoal text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-100'
                          }`}
                        >
                          {cat}
                        </span>
                      ))}
                    </div>

                    {/* Property Card 1 */}
                    <div className="bg-white rounded-xl overflow-hidden border border-gray-150 shadow-subtle">
                      <div className="relative h-24 sm:h-26 bg-gray-200 overflow-hidden">
                        <img
                          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800"
                          alt="Elysium Glasshouse Villa"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1.5 left-1.5 bg-black/80 text-[#D4AF37] px-1.5 py-0.5 rounded text-[7.5px] font-bold uppercase tracking-wider">
                          Signature Series
                        </div>
                        <div className="absolute bottom-1.5 right-1.5 bg-white/95 text-charcoal px-1.5 py-0.5 rounded-full text-[8.5px] font-extrabold shadow-sm">
                          ⭐ 4.98
                        </div>
                      </div>
                      <div className="p-2">
                        <h6 className="font-bold text-[10px] text-charcoal truncate">Elysium Glasshouse Villa</h6>
                        <p className="text-[8px] text-gray-500 font-semibold truncate">Nashik Hills · Private Pool</p>
                        <div className="mt-1 pt-1 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-charcoal">₹12,500 <span className="text-[7.5px] font-normal text-gray-500">/night</span></span>
                          <span className="bg-emerald-50 text-emerald-700 text-[7.5px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Zap className="w-2 h-2 fill-current" /> Instant
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Property Card 2 */}
                    <div className="bg-white rounded-xl p-2 border border-gray-150 shadow-subtle flex items-center gap-2">
                      <img
                        src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=400"
                        alt="Royal Lakefront Estate"
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h6 className="font-bold text-[9.5px] text-charcoal truncate">Royal Lakefront Estate</h6>
                        <p className="text-[7.5px] text-gray-500 font-medium truncate">Udaipur · 5 BHK Villa</p>
                        <span className="text-[9.5px] font-extrabold text-charcoal mt-0.5 block">₹18,000 /night</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom App Bar */}
                  <div className="bg-white py-1.5 px-3 border-t border-gray-100 flex justify-between items-center text-[7.5px] font-bold text-gray-400">
                    <div className="flex flex-col items-center text-[#875F00]">
                      <div className="w-1 h-1 rounded-full bg-[#875F00] mb-0.5" />
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
          <div className="lg:col-span-6 text-left space-y-4 lg:pl-2">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-sand-300 text-[#875F00] text-[10px] font-extrabold uppercase tracking-[0.18em] shadow-subtle">
              <Smartphone className="w-3 h-3 text-[#875F00]" />
              <span>OFFICIAL MOBILE APP</span>
            </div>

            {/* Title - Clean Simple Sans-Serif Typography */}
            <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-extrabold text-charcoal tracking-tight leading-[1.16] font-sans">
              Start Your Next Chapter with X-Space360
            </h2>

            {/* Description */}
            <p className="text-charcoal-muted text-xs sm:text-sm font-medium leading-relaxed max-w-xl">
              Your journey to hassle-free luxury stays begins here. Download the X-Space360 app to discover handpicked villas, co-working spaces, and event venues with direct host connectivity.
            </p>

            {/* Feature Bullets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {[
                'Exclusive app-only deals up to 30%',
                'Direct host contact & instant chat',
                '100% verified properties & pricing',
                '24/7 dedicated concierge care'
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-semibold text-charcoal">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#875F00] shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {/* ── STORE DOWNLOAD BUTTONS & CLICKABLE QR SCANNER ROW ── */}
            <div className="pt-4 border-t border-sand-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              
              {/* Clickable QR Code Scanner Box */}
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white p-2.5 rounded-2xl border border-sand-200 shadow-subtle flex items-center gap-3 group cursor-pointer hover:border-sand-400 hover:shadow-md transition-all duration-200 shrink-0"
                title="Click to open Play Store link"
              >
                <div className="relative bg-stone/60 p-1 rounded-xl border border-sand-200 shrink-0 overflow-hidden">
                  <img
                    src={QR_CODE_API}
                    alt="Scan QR code to Download X-Space360 App"
                    className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ExternalLink className="w-3.5 h-3.5 text-charcoal bg-white rounded-full p-0.5 shadow" />
                  </div>
                </div>
                <div className="text-left pr-1">
                  <div className="flex items-center gap-1 text-[8.5px] font-extrabold text-[#875F00] uppercase tracking-widest">
                    <QrCode className="w-2.5 h-2.5" />
                    <span>SCAN TO DOWNLOAD</span>
                  </div>
                  <h5 className="text-xs font-bold text-charcoal mt-0.5 leading-tight group-hover:text-[#875F00] transition-colors">
                    Scan with Phone
                  </h5>
                  <p className="text-[9.5px] text-gray-500 font-semibold mt-0.5">
                    Opens Play Store directly
                  </p>
                </div>
              </a>

              {/* Store Download Buttons - Exact 99acres HD Images */}
              <div className="flex flex-row items-center gap-2.5 shrink-0">
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block transition hover:opacity-90"
                >
                  <img
                    src="https://static.99acres.com/universalapp/img/Play.png"
                    alt="Get it on Google Play"
                    className="h-[40px] w-[135px] object-contain rounded-md"
                  />
                </a>

                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block transition hover:opacity-90"
                >
                  <img
                    src="https://static.99acres.com/universalapp/img/ios.png"
                    alt="Download on the App Store"
                    className="h-[40px] w-[135px] object-contain rounded-md"
                  />
                </a>
              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
