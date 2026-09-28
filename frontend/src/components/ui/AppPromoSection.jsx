import React from 'react';
import { Bell, Check, MapPin, Menu, Search, Star, Zap } from 'lucide-react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.xspace360.app&pcampaignid=web_share';

const benefits = [
  'Discover newly listed stays, workspaces and venues as soon as they go live',
  'Manage your bookings with ease and get instant updates from hosts'
];

function StoreBadges() {
  return (
    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
      <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Get X-Space360 on Google Play">
        <img
          src="https://static.99acres.com/universalapp/img/Play.png"
          alt="Get it on Google Play"
          className="h-[34px] sm:h-[38px] w-auto rounded-[5px] transition-opacity hover:opacity-85"
        />
      </a>
      <button
        type="button"
        onClick={() => window.alert('X-Space360 iOS App is launching soon on Apple App Store!')}
        aria-label="X-Space360 Apple App Store launch information"
      >
        <img
          src="https://static.99acres.com/universalapp/img/ios.png"
          alt="Download on the App Store"
          className="h-[34px] sm:h-[38px] w-auto rounded-[5px] transition-opacity hover:opacity-85"
        />
      </button>
    </div>
  );
}

function PhonePreview() {
  return (
    <div className="relative mx-auto h-[315px] w-[196px] rounded-[28px] border-[3px] border-[#4b5668] bg-white p-[9px] shadow-[0_13px_28px_rgba(24,39,60,0.24)] sm:h-[330px] sm:w-[205px]">
      <div className="absolute left-1/2 top-[5px] z-20 h-[13px] w-[50px] -translate-x-1/2 rounded-full bg-[#182334]" />
      <div className="h-full overflow-hidden rounded-[19px] border border-[#e1e6ec] bg-[#f7f8f9] text-[#17243b]">
        <div className="bg-white px-3 pb-2 pt-5">
          <div className="mb-2 flex items-center justify-between">
            <Menu className="h-3 w-3 text-[#8490a0]" />
            <img src="/logo.png" alt="X-Space360" className="h-[17px] w-[92px] object-contain" />
            <Search className="h-3.5 w-3.5 text-[#8490a0]" />
          </div>
          <div className="flex items-center gap-1 rounded-full border border-[#e5e8ec] bg-[#fafafa] px-2 py-1.5 text-[6px] text-[#8994a3]">
            <MapPin className="h-2.5 w-2.5 text-[#b18417]" />
            Search stays, workspaces &amp; venues
          </div>
        </div>

        <div className="space-y-2 p-2.5">
          <div className="flex gap-1 text-[6px] font-bold">
            <span className="rounded-full bg-[#162238] px-2 py-1 text-white">Villas</span>
            <span className="rounded-full bg-white px-2 py-1">Workspaces</span>
            <span className="rounded-full bg-white px-2 py-1">Venues</span>
          </div>
          <p className="text-[8px] font-bold">Recommended for you</p>
          <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5">
            <div className="relative h-[83px] overflow-hidden">
              <img
                src="/videos/Discover our collection/Villas/Bellissimo Villa4 (1).jpg"
                alt="Featured X-Space360 villa"
                className="h-full w-full object-cover"
              />
              <span className="absolute left-1.5 top-1.5 rounded bg-[#17243b] px-1.5 py-0.5 text-[5px] font-bold uppercase tracking-wide text-white">Signature stay</span>
              <span className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-full bg-white px-1.5 py-0.5 text-[6px] font-extrabold">
                <Star className="h-2 w-2 fill-[#e3ae1a] text-[#e3ae1a]" /> 4.9
              </span>
            </div>
            <div className="p-2">
              <p className="truncate text-[7px] font-bold">Bellissimo Private Villa</p>
              <div className="mt-1 flex items-end justify-between">
                <span className="text-[7px] font-extrabold">₹12,500 <small className="font-normal text-[#8490a0]">/night</small></span>
                <span className="flex items-center gap-0.5 text-[5px] font-bold text-emerald-700"><Zap className="h-2 w-2 fill-current" /> Instant</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -right-[31px] top-[75px] flex h-11 w-11 items-center justify-center rounded-full bg-[#087f5b] text-white shadow-[0_6px_16px_rgba(8,127,91,0.35)] ring-[5px] ring-white/85">
        <Bell className="h-5 w-5 fill-white" />
        <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-[#e32727] ring-2 ring-white" />
      </div>
    </div>
  );
}

function CitySilhouette() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[75px] overflow-hidden text-[#f6d999] opacity-55">
      <svg viewBox="0 0 1200 75" preserveAspectRatio="none" className="h-full w-full fill-current">
        <path d="M0 75V60h34V45h13v15h18V32h28v43h22V53h14v22h44V44h30v31h41V56h22v19h38V36h20v39h52V51h13v24h35V43h27v32h45V58h25v17h55V39h25v36h26V55h17v20h37V31h34v44h48V49h21v26h50V41h29v34h23V52h17v23h54V45h34v30h42V57h18v18h52V37h28v38h20V55h19v20h47V47h28v28h40V59h19v16Z" />
        <path d="M75 49h5v6h-5zm12 0h5v6h-5zm101 3h5v6h-5zm11 0h5v6h-5zm302-2h5v6h-5zm12 0h5v6h-5zm372 3h5v6h-5zm12 0h5v6h-5zm204-5h5v6h-5z" className="fill-white/80" />
      </svg>
    </div>
  );
}

export default function AppPromoSection() {
  return (
    <section className="app-promo-open-sans mx-auto my-8 w-full max-w-[1216px] px-4 sm:my-10 sm:px-6 lg:px-0">
      <div className="relative min-h-[310px] overflow-hidden rounded-[14px] bg-[#fff5e6] px-6 py-8 sm:px-10 lg:h-[332px] lg:px-12 lg:py-0">
        <CitySilhouette />

        <div className="relative z-10 grid h-full grid-cols-1 items-center gap-7 lg:grid-cols-[62%_38%]">
          <div className="max-w-[710px] py-1 text-left lg:py-0">
            <h2 className="text-[22px] font-bold leading-tight text-[#142844] sm:text-[24px]">
              Download X-Space360 Mobile App
            </h2>
            <p className="mt-2 text-[13px] font-normal text-[#526174] sm:text-sm">
              and never miss out on the perfect space
            </p>

            <div className="mt-5 space-y-3.5 sm:mt-6">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3 text-[13px] font-normal leading-5 text-[#172b45] sm:text-[15px]">
                  <Check className="mt-0.5 h-[19px] w-[19px] shrink-0 stroke-[2.5] text-[#0795c9]" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 sm:mt-6">
              <StoreBadges />
            </div>
          </div>

          <div className="relative hidden h-full items-end justify-center lg:flex">
            <PhonePreview />
            <div className="absolute bottom-[20px] left-1/2 z-30 flex -translate-x-[24%] items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-[#24364f] shadow-[0_4px_15px_rgba(25,47,75,0.17)]">
              <span className="text-[#0795c9]">↓</span>
              Thousands of happy guests
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
