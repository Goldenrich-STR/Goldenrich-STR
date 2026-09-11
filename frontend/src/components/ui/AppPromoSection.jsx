import React, { useState } from 'react';
import { Smartphone, Download, CheckCircle2, Star, Zap, ShieldCheck, MapPin, ArrowRight, ExternalLink, QrCode } from 'lucide-react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.xspace360.app&pcampaignid=web_share';
const QR_CODE_API = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(PLAY_STORE_URL)}`;

export default function AppPromoSection() {
  const [activeTab, setActiveTab] = useState('villas');

  return (
    <div className="w-full bg-[#FAF7F2] py-16 md:py-24 border-t border-b border-sand-200/80 my-16 overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8">
        
        {/* Main Banner Card */}
        <div className="relative rounded-[2.5rem] md:rounded-[3.5rem] bg-gradient-to-br from-[#1E1E1E] via-[#2A2926] to-[#121212] border border-[#D4AF37]/30 shadow-2xl p-6 sm:p-10 lg:p-16 overflow-hidden text-white">
          
          {/* Subtle Background Glow Spheres */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#875F00]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0,transparent_70%)] pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* ================= LEFT SIDE: IPHONE 15 PRO MOCKUP WITH ANIMATED APP VIEW & FLOATING BADGES ================= */}
            <div className="lg:col-span-6 relative flex justify-center items-center py-6 sm:py-8">
              
              {/* Floating Pill Badge 1: Top Left */}
              <div className="absolute -top-2 left-2 sm:left-4 z-30 animate-float-slow bg-white/95 backdrop-blur-md text-charcoal border border-sand-200 shadow-xl rounded-full px-4 py-2 flex items-center gap-2 text-xs font-bold shrink-0">
                <div className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <span>Find your dream stay</span>
              </div>

              {/* Floating Pill Badge 2: Middle Left */}
              <div className="hidden sm:flex absolute top-1/3 -left-4 z-30 animate-float-reverse bg-white/95 backdrop-blur-md text-charcoal border border-sand-200 shadow-xl rounded-full px-4 py-2 items-center gap-2 text-xs font-bold shrink-0">
                <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <span>Instant Confirmation</span>
              </div>

              {/* Floating Pill Badge 3: Bottom Right */}
              <div className="absolute bottom-4 right-0 sm:right-4 z-30 animate-float-slow bg-white/95 backdrop-blur-md text-charcoal border border-sand-200 shadow-xl rounded-full px-4 py-2 flex items-center gap-2 text-xs font-bold shrink-0">
                <div className="w-6 h-6 rounded-full bg-terracotta/15 text-[#875F00] flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span>100% Verified Spaces</span>
              </div>

              {/* Floating Pill Badge 4: Top Right */}
              <div className="hidden sm:flex absolute top-8 -right-2 z-30 animate-float-reverse bg-white/95 backdrop-blur-md text-charcoal border border-sand-200 shadow-xl rounded-full px-4 py-2 items-center gap-2 text-xs font-bold shrink-0">
                <div className="w-6 h-6 rounded-full bg-yellow-500/15 text-yellow-600 flex items-center justify-center">
                  <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                </div>
                <span>Direct Host Rates</span>
              </div>

              {/* ── 3D Titanium iPhone 15 Pro Outer Frame ── */}
              <div className="relative w-[280px] sm:w-[310px] h-[560px] sm:h-[610px] bg-[#1c1b20] rounded-[50px] p-3 sm:p-3.5 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8)] border-[3px] border-[#44424a] relative z-20 group hover:scale-[1.01] transition-transform duration-500">
                
                {/* iPhone Dynamic Island Notch */}
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-40 flex items-center justify-end px-2.5 gap-1.5 shadow-inner">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0a0a0f] border border-gray-800" />
                  <div className="w-2 h-2 rounded-full bg-[#12121a] border border-blue-900/40" />
                </div>

                {/* iPhone Inner Screen Container */}
                <div className="w-full h-full bg-[#FAF9F5] rounded-[42px] overflow-hidden relative flex flex-col justify-between text-charcoal shadow-inner border border-black/10">
                  
                  {/* Simulated App Header */}
                  <div className="bg-white px-4 pt-10 pb-3 border-b border-gray-100 shadow-sm text-left">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <img src="/logo.png" alt="X-Space360" className="h-5 w-auto object-contain" />
                      </div>
                      <span className="bg-[#875F00] text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        PRO
                      </span>
                    </div>

                    {/* App Search Bar inside phone screen */}
                    <div className="bg-stone/80 rounded-full px-3 py-1.5 flex items-center gap-2 border border-sand-200">
                      <MapPin className="w-3 h-3 text-[#875F00]" />
                      <span className="text-[10px] font-bold text-gray-500 truncate">Search luxury villas & venues...</span>
                    </div>
                  </div>

                  {/* Animated App Screen Body (Live App Card Preview) */}
                  <div className="flex-1 p-3 overflow-hidden space-y-3 text-left bg-stone/40">
                    
                    {/* Simulated Category Pills */}
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
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

                    {/* Simulated Property Card 1 */}
                    <div className="bg-white rounded-2xl overflow-hidden border border-gray-150 shadow-subtle group/appcard">
                      <div className="relative h-28 bg-gray-200 overflow-hidden">
                        <img
                          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800"
                          alt="Luxury Villa Preview"
                          className="w-full h-full object-cover group-hover/appcard:scale-105 transition duration-500"
                        />
                        <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md text-[#D4AF37] px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider">
                          Signature Series
                        </div>
                        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-md text-charcoal px-2 py-0.5 rounded-full text-[9px] font-extrabold shadow">
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

                    {/* Simulated Property Card 2 */}
                    <div className="bg-white rounded-2xl p-2.5 border border-gray-150 shadow-subtle flex items-center gap-2.5">
                      <img
                        src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=400"
                        alt="Royal Lakefront Estate"
                        className="w-14 h-14 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h6 className="font-bold text-[10px] text-charcoal truncate">Royal Lakefront Estate</h6>
                        <p className="text-[8px] text-gray-500 font-medium truncate">Udaipur · 5 BHK Villa</p>
                        <span className="text-[10px] font-extrabold text-charcoal mt-0.5 block">₹18,000 /night</span>
                      </div>
                    </div>
                  </div>

                  {/* Simulated App Bottom Navigation */}
                  <div className="bg-white py-2.5 px-4 border-t border-gray-100 flex justify-between items-center text-[8px] font-bold text-gray-400">
                    <div className="flex flex-col items-center text-[#875F00]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#875F00] mb-0.5" />
                      <span>Discover</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span>Explore</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span>Wishlist</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span>Bookings</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* ================= RIGHT SIDE: PROMO HEADLINE, CLICKABLE QR SCANNER & STORE DOWNLOAD BUTTONS ================= */}
            <div className="lg:col-span-6 text-left space-y-6 lg:pl-6">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-[#D4AF37] text-xs font-bold uppercase tracking-[0.2em] shadow-subtle">
                <Smartphone className="w-4 h-4 text-[#D4AF37]" />
                <span>OFFICIAL MOBILE APP</span>
              </div>

              {/* Main Headline */}
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.15] font-lufga">
                Experience Luxury Stays on the Go
              </h2>

              {/* Subheading */}
              <p className="text-gray-300 text-sm sm:text-base font-medium leading-relaxed max-w-xl">
                Unlock exclusive app-only villa rates, instant host messaging, real-time booking updates, and keyless check-in instructions right from your phone.
              </p>

              {/* Feature Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  'App-only discounts up to 30%',
                  'Direct host contact & instant chat',
                  'Live GPS directions & check-in codes',
                  '24/7 dedicated concierge care'
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs font-semibold text-gray-200">
                    <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              {/* ── CLICKABLE QR CODE SCANNER & STORE BUTTONS ROW (As requested in prompt & Image 1/2) ── */}
              <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-6">
                
                {/* CLICKABLE QR CODE SCANNER BOX */}
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white p-3.5 rounded-3xl border border-white/40 shadow-2xl flex items-center gap-4 group cursor-pointer hover:scale-[1.03] transition-transform duration-300 shrink-0"
                  title="Click to download X-Space360 App on Google Play"
                >
                  <div className="relative bg-stone/80 p-1.5 rounded-2xl border border-sand-200 shrink-0 overflow-hidden">
                    <img
                      src={QR_CODE_API}
                      alt="Scan to Download X-Space360 App"
                      className="w-20 h-20 sm:w-22 sm:h-22 object-contain rounded-xl"
                    />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ExternalLink className="w-5 h-5 text-charcoal bg-white/90 rounded-full p-1 shadow" />
                    </div>
                  </div>
                  <div className="text-left pr-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-[#875F00] uppercase tracking-widest">
                      <QrCode className="w-3.5 h-3.5" />
                      <span>SCAN TO DOWNLOAD</span>
                    </div>
                    <h5 className="text-sm font-extrabold text-charcoal mt-0.5 leading-tight group-hover:text-[#875F00] transition-colors">
                      Scan QR Code
                    </h5>
                    <p className="text-[11px] text-gray-500 font-semibold mt-1">
                      Point camera to open Play Store link
                    </p>
                  </div>
                </a>

                {/* STORE DOWNLOAD BUTTONS */}
                <div className="flex flex-col sm:flex-col justify-center gap-3 shrink-0">
                  
                  {/* Google Play Store Button */}
                  <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-black hover:bg-black/90 text-white border border-white/20 rounded-2xl px-5 py-3 flex items-center gap-3 transition-all duration-200 shadow-md hover:scale-[1.02] active:scale-95 group"
                  >
                    <svg className="w-6 h-6 fill-current text-white shrink-0" viewBox="0 0 24 24">
                      <path d="M3.609 1.814L13.792 12 3.61 22.186a1.492 1.492 0 0 1-.61-.954V2.768c0-.368.22-.725.609-.954zm11.3 9.072l2.366-2.366 3.684 2.1c.905.516.905 1.354 0 1.87l-3.684 2.1-2.366-2.366zm-1.118 1.118L4.693 21.096l10.2-5.836-1.102-1.256zm0-2.008l1.102-1.256L4.693 2.904l9.098 9.098z"/>
                    </svg>
                    <div className="text-left">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Get it on</p>
                      <p className="text-xs font-black text-white tracking-tight leading-none mt-1 group-hover:text-[#D4AF37] transition-colors">Google Play</p>
                    </div>
                  </a>

                  {/* Apple App Store Button */}
                  <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-black hover:bg-black/90 text-white border border-white/20 rounded-2xl px-5 py-3 flex items-center gap-3 transition-all duration-200 shadow-md hover:scale-[1.02] active:scale-95 group"
                  >
                    <svg className="w-6 h-6 fill-current text-white shrink-0" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.31c.67-.82 1.13-1.96.99-3.11-.98.04-2.19.66-2.88 1.47-.62.72-1.16 1.89-.99 3.01 1.1.09 2.21-.55 2.88-1.37z"/>
                    </svg>
                    <div className="text-left">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Download on the</p>
                      <p className="text-xs font-black text-white tracking-tight leading-none mt-1 group-hover:text-[#D4AF37] transition-colors">App Store</p>
                    </div>
                  </a>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
