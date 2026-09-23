import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Facebook, Instagram, Linkedin, MapPin, Mail, Phone } from 'lucide-react';
import LegalDocument from './LegalDocument';

const WhatsAppIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);

const DEFAULT_FOOTER_DATA = {
  brand_description: 'Redefining short-term rentals and spaces in India through technology, curation, and verified service.',
  location: 'Nashik, Maharashtra',
  email: 'support@x-space360.com',
  phone: '+91 919225586010',
  facebook_link: 'https://www.facebook.com/share/1H3z56BJu4/',
  linkedin_link: 'https://www.linkedin.com/company/139624194/admin/dashboard/',
  instagram_link: 'https://www.instagram.com/xspace360.in?stkn=aHVpY25wem5rN2V6',
  whatsapp_link: 'https://api.whatsapp.com/send?phone=919225586010&text=Hi%2C%20I%27m%20interested%20in%20booking%20a%20stay.%20Please%20share%20details.',
  privacy_label: 'Privacy Policy',
  privacy_text: 'X-Space360 respects your privacy. We collect only the information needed to manage accounts, property listings, bookings, support, verification, and secure platform operations.',
  terms_label: 'Terms & Conditions',
  terms_text: 'By using X-Space360, users agree to follow booking, listing, verification, payment, cancellation, and platform conduct rules published by X-Space360.',
  refund_label: 'Cancellation & Refund Policy',
  refund_text: 'Cancellation & Refund policy guidelines for guests and hosts operating on X-Space360.'
};

export default function Footer({ cmsContent }) {
  const navigate = useNavigate();
  const [footerPopup, setFooterPopup] = useState(null);

  const footerData = { ...DEFAULT_FOOTER_DATA, ...(cmsContent?.footer || {}) };
  const legalData = { ...footerData, ...(cmsContent?.legal_terms || {}) };

  const footerLegalItems = [
    ...(legalData.privacy_text ? [{ label: legalData.privacy_label || 'Privacy Policy', text: legalData.privacy_text }] : []),
    ...(legalData.terms_text ? [{ label: legalData.terms_label || 'Terms & Conditions', text: legalData.terms_text }] : []),
    ...(legalData.refund_text ? [{ label: legalData.refund_label || 'Cancellation & Refund Policy', text: legalData.refund_text }] : []),
    ...(Array.isArray(legalData.custom_policies)
      ? legalData.custom_policies
          .filter(policy => policy?.status === 'Active' && policy?.text)
          .map(policy => ({ label: policy.label || policy.title || 'Legal Policy', text: policy.text }))
      : []),
  ];

  const handleLegalClick = (item) => {
    setFooterPopup({
      title: item.label || 'X-Space360 Legal',
      text: item.text || 'Details will be updated soon.',
    });
  };

  return (
    <>
      {/* Modern Sleek Dark Footer Section */}
      <footer className="relative overflow-hidden bg-[#0A121D] text-white border-t border-white/10">
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 md:px-10 lg:px-12 lg:py-24">
          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:gap-10">
            {/* Column 1: Brand Info */}
            <div className="space-y-4">
              <button
                type="button"
                className="flex items-center text-left"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label="Back to top"
              >
                <img src="/logo.png" alt="X-Space360 Logo" className="h-9 w-auto object-contain logo-white" />
              </button>
              <p className="text-xs font-normal leading-relaxed text-gray-300">
                {footerData.brand_description}
              </p>
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">Connect with us</span>
                <div className="flex items-center gap-2.5">
                  {[
                    { icon: Facebook, url: footerData.facebook_link || 'https://www.facebook.com/share/1H3z56BJu4/', label: 'Facebook' },
                    { icon: Linkedin, url: footerData.linkedin_link || 'https://www.linkedin.com/company/139624194/admin/dashboard/', label: 'LinkedIn' },
                    { icon: Instagram, url: footerData.instagram_link || 'https://www.instagram.com/xspace360.in?stkn=aHVpY25wem5rN2V6', label: 'Instagram' },
                    { icon: WhatsAppIcon, url: footerData.whatsapp_link || 'https://api.whatsapp.com/send?phone=919225586010&text=Hi%2C%20I%27m%20interested%20in%20booking%20a%20stay.%20Please%20share%20details.', label: 'WhatsApp' },
                  ].filter(social => social.url).map((social) => {
                    const IconComponent = social.icon;
                    return (
                      <a
                        key={social.label}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={social.label}
                        title={social.label}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 transition hover:bg-white/20 hover:text-white"
                      >
                        <IconComponent className="h-3.5 w-3.5" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Column 2: X-Space360 Stays */}
            <div>
              <h5 className="mb-5 text-sm font-bold uppercase tracking-wider text-white">X-Space360 Stays</h5>
              <ul className="space-y-3.5 text-xs text-gray-300">
                <li>
                  <button type="button" onClick={() => navigate('/property/residential')} className="hover:text-white transition">
                    Residential Villas &amp; Homes
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigate('/property/workspaces/')} className="hover:text-white transition">
                    Commercial &amp; Workspaces
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigate('/event-venues/')} className="hover:text-white transition">
                    Event Venues &amp; Rooftops
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigate('/guest/browse')} className="hover:text-white transition">
                    All India Locations
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigate('/list-your-property')} className="hover:text-white transition">
                    Post Your Property
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Company */}
            <div>
              <h5 className="mb-5 text-sm font-bold uppercase tracking-wider text-white">Company</h5>
              <ul className="space-y-3.5 text-xs text-gray-300">
                <li>
                  <button type="button" onClick={() => navigate('/about-us')} className="hover:text-white transition">
                    About Us
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigate('/blog')} className="hover:text-white transition">
                    Articles &amp; Blog
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigate('/support')} className="hover:text-white transition">
                    Support &amp; Help Center
                  </button>
                </li>
                {footerLegalItems.map((item) => (
                  <li key={item.label}>
                    <button
                      type="button"
                      onClick={() => handleLegalClick(item)}
                      className="hover:text-white transition text-left"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Contact Us */}
            <div>
              <h5 className="mb-5 text-sm font-bold uppercase tracking-wider text-white">Contact Us</h5>
              <div className="space-y-4 text-xs text-gray-300">
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 text-gray-400 shrink-0" />
                  <span>{footerData.location || 'Nashik, Maharashtra'}, India</span>
                </div>
                <a href={`mailto:${footerData.email || 'support@x-space360.com'}`} className="flex items-center gap-2.5 hover:text-white transition break-all">
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>{footerData.email || 'support@x-space360.com'}</span>
                </a>
                <a href="tel:+91919225586010" className="flex items-center gap-2.5 hover:text-white transition">
                  <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>+91 919225586010</span>
                </a>
                <div className="pt-2 text-xs text-gray-400">
                  <span>Operating Hours: 9:30 AM to 6:30 PM (Mon-Sat)</span>
                </div>
              </div>
            </div>

            {/* Column 5: Download App */}
            <div className="space-y-4">
              <h5 className="text-sm font-bold uppercase tracking-wider text-white">Download the App</h5>
              <p className="text-[11px] text-gray-300 leading-snug">
                Book stays on the go and manage property hosting directly from mobile.
              </p>
              <div className="flex flex-row items-center gap-3">
                <a
                  href="#download-android"
                  onClick={(e) => { e.preventDefault(); alert('X-Space360 Android App is launching soon on Google Play Store!'); }}
                  className="inline-block transition hover:opacity-90"
                >
                  <img
                    src="https://static.99acres.com/universalapp/img/Play.png"
                    alt="Get it on Google Play"
                    className="h-[42px] w-[142px] object-contain rounded-md"
                  />
                </a>

                <a
                  href="#download-ios"
                  onClick={(e) => { e.preventDefault(); alert('X-Space360 iOS App is launching soon on Apple App Store!'); }}
                  className="inline-block transition hover:opacity-90"
                >
                  <img
                    src="https://static.99acres.com/universalapp/img/ios.png"
                    alt="Download on the App Store"
                    className="h-[42px] w-[142px] object-contain rounded-md"
                  />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Copyright & Legal row */}
          <div className="mt-12 border-t border-white/10 pt-6 text-center md:flex md:items-center md:justify-between md:text-left">
            <p className="text-[11px] font-normal text-gray-400">
              © 2026 X-SPACE360. Owned &amp; Operated by Golden Rich Financial Solutions &amp; Real Estate Solutions Pvt Ltd. All rights reserved.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 md:mt-0 text-[11px] text-gray-400">
              {footerLegalItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleLegalClick(item)}
                  className="hover:text-white transition"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Footer Legal Document Modal */}
      {footerPopup && (
        <div className="fixed inset-0 z-[120] bg-charcoal/70 backdrop-blur-sm flex items-center justify-center px-4 py-6">
          <div className="bg-white rounded-2xl shadow-elevated border border-gray-100 w-full max-w-4xl max-h-[88vh] overflow-hidden animate-scale-in text-charcoal">
            <div className="px-6 py-5 md:px-8 border-b border-gray-100 bg-white flex items-start justify-between gap-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-terracotta mb-2">
                  Legal Document
                </p>
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-charcoal">
                  {footerPopup.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFooterPopup(null)}
                className="w-10 h-10 rounded-full border border-gray-100 text-gray-500 hover:text-charcoal hover:bg-stone transition flex items-center justify-center shrink-0"
                aria-label="Close footer details"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[calc(88vh-96px)] overflow-y-auto px-6 py-6 md:px-10 md:py-8">
              <LegalDocument text={footerPopup.text} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
