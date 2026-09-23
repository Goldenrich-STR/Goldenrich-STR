import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle2 } from 'lucide-react';
import SEO from '../components/SEO';

const benefits = [
  'Reach guests searching across Nashik and nearby destinations',
  'Manage availability, pricing and bookings from one dashboard',
  'Get support while setting up and publishing your listing'
];

const ListYourPropertyPage = () => (
  <main className="min-h-screen bg-[#F8F6F1] text-charcoal">
    <SEO
      title="List Your Property & Get More Bookings | X-Space360"
      description="List your villa, homestay, farmhouse or other property with X-Space360 and reach guests looking for stays in Nashik and nearby destinations."
      path="/list-your-property"
      appendSiteName={false}
      breadcrumbs={[
        { name: 'Home', url: '/' },
        { name: 'List Your Property', url: '/list-your-property' }
      ]}
    />

    <header className="border-b border-black/5 bg-white">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link to="/" aria-label="X-Space360 home">
          <img src="/logo.png" alt="X-Space360" className="h-9 w-auto" />
        </Link>
        <Link to="/login" className="text-sm font-bold hover:text-terracotta">Sign In</Link>
      </div>
    </header>

    <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-28">
      <div>
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-800">
          <Building2 size={16} /> Become a Host
        </div>
        <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-[#0F4A33] md:text-6xl">
          List Your Property with X-Space360
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">
          Showcase your villa, homestay, farmhouse or rental space to guests planning stays in Nashik and nearby destinations.
        </p>
        <Link
          to="/register/host"
          className="mt-9 inline-flex items-center gap-2 rounded-full bg-charcoal px-7 py-4 font-bold text-white transition hover:bg-black"
        >
          Start Listing <ArrowRight size={18} />
        </Link>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-elevated">
        <h2 className="text-2xl font-black">Why list with us?</h2>
        <div className="mt-7 space-y-5">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex gap-3 text-gray-700">
              <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={21} />
              <span>{benefit}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  </main>
);

export default ListYourPropertyPage;
