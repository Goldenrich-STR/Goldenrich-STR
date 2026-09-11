import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { 
  CheckCircle, FileText, Shield, Sparkles, Menu, X, 
  MapPin, Mail, Phone, Facebook, Instagram, Youtube, Lock
} from 'lucide-react';
import SEO from '../components/SEO';
import { cmsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LanguageSelector from '../components/LanguageSelector';
import LegalDocument from '../components/LegalDocument';

const DEFAULT_LEGAL = {
  title: 'Legal Terms & Platform Policies',
  version: '2026.1',
  effective_date: '2026-07-03',
  terms_label: 'Terms & Conditions',
  terms_text: '',
  privacy_label: 'Privacy Policy',
  privacy_text: '',
  refund_label: 'Cancellation & Refund Policy',
  refund_text: '',
  custom_policies: []
};

const DEFAULT_FOOTER_DATA = {
  brand_description: 'Redefining short-term rentals in India through curation, technology, and superior service.',
  location: 'Nashik, Maharashtra',
  email: 'support@x-space360.com',
  phone: '+91 8484826247',
  facebook_link: 'https://facebook.com',
  instagram_link: 'https://instagram.com',
  youtube_link: 'https://youtube.com',
  footer_sections: [
    { heading: 'For Guests', items: [
      { label: 'Browse Collections', action_type: 'link', link: '/guest/browse', text: '' },
      { label: 'All Destinations', action_type: 'link', link: '/guest/browse', text: '' },
      { label: 'Short-term Stays', action_type: 'link', link: '/guest/browse?category=residential', text: '' }
    ] },
    { heading: 'For Hosts', items: [
      { label: 'List Your Space', action_type: 'link', link: '/host/list-property', text: '' },
      { label: 'Become a Host', action_type: 'link', link: '/register?role=host', text: '' }
    ] },
    { heading: 'Company', items: [
      { label: 'About Us', action_type: 'link', link: '/about-us', text: '' },
      { label: 'Blog', action_type: 'link', link: '/blog', text: '' }
    ] },
    { heading: 'Support', items: [
      { label: 'Help Center', action_type: 'link', link: '/support', text: '' },
      { label: 'Cancellation Options', action_type: 'text', link: '', text: 'Cancellation options depend on the booking terms shared during confirmation.' },
      { label: 'Check-In Instructions', action_type: 'text', link: '', text: 'Standard check-in time starts at 2:00 PM. Please present your valid Government ID upon arrival.' },
      { label: 'Safety & Privacy', action_type: 'text', link: '', text: 'X-Space360 respects your privacy. We collect only the information needed to manage accounts, property listings, bookings, support, verification, and secure platform operations.' },
      { label: 'Contact Us', action_type: 'link', link: '/support', text: '' }
    ] }
  ]
};

const markdownComponents = {
  h1: ({ node, ...props }) => <h1 className="text-2xl md:text-3xl font-extrabold text-charcoal mb-4 tracking-tight" {...props} />,
  h2: ({ node, ...props }) => <h2 className="text-xl md:text-2xl font-bold text-charcoal mt-8 mb-3 tracking-tight" {...props} />,
  h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-charcoal mt-6 mb-2" {...props} />,
  p: ({ node, ...props }) => <p className="text-sm md:text-base leading-relaxed text-charcoal-light mb-4 font-medium" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-2 text-charcoal-light text-sm md:text-base font-medium" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-2 text-charcoal-light text-sm md:text-base font-medium" {...props} />,
  li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-extrabold text-charcoal" {...props} />,
  a: ({ node, ...props }) => <a className="font-bold text-terracotta hover:underline" {...props} />,
};

const slugify = (value) => String(value || '')
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const SITE_URL = 'https://x-space360.in';

const LegalPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [lang, setLang] = useState(localStorage.getItem('preferredLanguage') || 'en');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [legalData, setLegalData] = useState(DEFAULT_LEGAL);
  const [cmsContent, setCmsContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [footerPopup, setFooterPopup] = useState(null);

  useEffect(() => {
    let mounted = true;
    cmsAPI.getLandingPage()
      .then((res) => {
        if (!mounted) return;
        setCmsContent(res.data);
        setLegalData({ ...DEFAULT_LEGAL, ...(res.data?.footer || {}), ...(res.data?.legal_terms || {}) });
      })
      .catch(() => {
        if (mounted) setLegalData(DEFAULT_LEGAL);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const documents = useMemo(() => {
    const baseDocs = [
      legalData.terms_text ? {
        id: 'terms',
        type: 'policy',
        title: legalData.terms_label || 'Terms & Conditions',
        text: legalData.terms_text,
        status: 'Active',
      } : null,
      legalData.privacy_text ? {
        id: 'privacy',
        type: 'policy',
        title: legalData.privacy_label || 'Privacy Policy',
        text: legalData.privacy_text,
        status: 'Active',
      } : null,
      legalData.refund_text ? {
        id: 'refund-policy',
        type: 'policy',
        title: legalData.refund_label || 'Cancellation & Refund Policy',
        text: legalData.refund_text,
        status: 'Active',
      } : null,
    ].filter(Boolean);

    const customDocs = Array.isArray(legalData.custom_policies)
      ? legalData.custom_policies
          .filter(policy => policy?.status === 'Active' && policy?.text)
          .map(policy => ({
            id: policy.id || slugify(policy.title),
            type: policy.type || 'policy',
            title: policy.label || policy.title || 'Legal Policy',
            text: policy.text,
            status: policy.status || 'Active',
          }))
      : [];

    return [...baseDocs, ...customDocs];
  }, [legalData]);

  const pathParts = location.pathname.split('/').filter(Boolean);
  const requestedSlug = pathParts[0] === 'legal'
    ? (pathParts[1] || 'terms')
    : (pathParts[0] || 'terms');
  const selectedDoc = useMemo(() => {
    if (requestedSlug === 'terms') return documents.find(doc => doc.id === 'terms') || null;
    if (requestedSlug === 'privacy') return documents.find(doc => doc.id === 'privacy') || null;
    if (requestedSlug === 'refund-policy') return documents.find(doc => doc.id === 'refund-policy') || null;
    return documents.find(doc => slugify(doc.title) === requestedSlug || doc.id === requestedSlug) || documents[0] || null;
  }, [documents, requestedSlug]);
  const isLegalIndex = location.pathname === '/legal' || location.pathname === '/legal/';
  const canonicalPath = isLegalIndex ? '/legal' : location.pathname;
  const legalTitle = isLegalIndex ? 'Legal Policies and Terms' : (selectedDoc?.title || 'Legal Policies and Terms');
  const legalDescription = isLegalIndex
    ? 'Read X-Space360 terms and conditions, privacy policy, cancellation policy, refund policy, host rules and guest guidelines.'
    : `Review ${selectedDoc?.title || 'X-Space360 legal policies'}, including terms for property listings, bookings, payments, cancellations, refunds and platform use.`;
  const legalSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE_URL}${canonicalPath}#webpage`,
    url: `${SITE_URL}${canonicalPath}`,
    name: isLegalIndex ? "X-Space360 Legal Policies" : (selectedDoc?.title || "X-Space360 Legal Policies"),
    description: isLegalIndex
      ? "Review X-Space360 terms, privacy policy, cancellation policy, refund policy, host rules and guest guidelines."
      : legalDescription,
    isPartOf: {
      "@id": "https://x-space360.in/#website",
    },
    about: {
      "@id": "https://x-space360.in/#organization",
    },
    inLanguage: "en-IN",
  };

  const footerData = { ...DEFAULT_FOOTER_DATA, ...(cmsContent?.footer || {}) };
  let rawSections = Array.isArray(footerData.footer_sections) && footerData.footer_sections.length
    ? [...footerData.footer_sections]
    : [...DEFAULT_FOOTER_DATA.footer_sections];

  const footerSections = rawSections.map((rawSection, index) => {
    const section = rawSection || {};
    return {
      ...section,
      heading: (!section.heading || /^Section\s+\d+$/i.test(section.heading))
        ? ['For Guests', 'For Hosts', 'Company', 'Support'][index]
        : section.heading,
      items: Array.isArray(section.items) && section.items.length
        ? section.items.filter(Boolean).map(item => ({
          label: item.label || '',
          action_type: item.action_type || 'link',
          link: item.link || '',
          text: item.text || '',
        }))
        : []
    };
  });

  const footerLegalItems = [
    ...(legalData.privacy_text ? [{ label: legalData.privacy_label || 'Privacy Policy', action_type: 'text', link: '', text: legalData.privacy_text }] : []),
    ...(legalData.terms_text ? [{ label: legalData.terms_label || 'Terms & Conditions', action_type: 'text', link: '', text: legalData.terms_text }] : []),
    ...(legalData.refund_text ? [{ label: legalData.refund_label || 'Cancellation & Refund Policy', action_type: 'text', link: '', text: legalData.refund_text }] : []),
    { label: 'Cookie Policy', action_type: 'text', link: '', text: 'X-Space360 uses essential cookies to keep accounts, bookings, payments, and security features working smoothly.' },
  ];

  const handleFooterLink = (url, fallbackUrl = '/') => {
    const target = url || fallbackUrl;
    if (target.startsWith('#')) {
      navigate('/' + target);
      return;
    }
    navigate(target);
  };

  const handleFooterSectionClick = (section = {}, item = {}) => {
    if (item.action_type === 'link' && item.link) {
      if (item.link === '/host/list-property') {
        navigate(user ? item.link : '/register?role=host');
      } else {
        handleFooterLink(item.link, '/');
      }
      return;
    }
    setFooterPopup({
      title: item.label || section.heading || 'X-Space360',
      text: item.text || 'Details will be updated soon.',
    });
  };

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-sand-50 font-sans text-charcoal flex flex-col justify-between">
      <SEO
        title={legalTitle}
        description={legalDescription}
        path={canonicalPath}
        keywords={[
          "X-Space360 legal policy",
          "booking cancellation policy",
          "refund policy",
          "host terms",
          "guest terms",
        ]}
        schema={legalSchema}
        type="website"
      />

      {/* Header / Navbar */}
      <nav className="w-full z-50 flex justify-between items-center text-charcoal px-6 md:px-12 lg:px-20 h-20 bg-white/90 backdrop-blur-md border-b border-stone sticky top-0 shadow-sm">
        <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
          <img src="/logo.png" alt="X-Space360 Logo" className="h-8 md:h-10 w-auto object-contain" />
        </div>

        {/* Center Pill Links */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-12 items-center px-8 space-x-6 font-semibold text-[11px] uppercase tracking-widest text-charcoal bg-stone/80 backdrop-blur-md border border-stone-200 rounded-full shadow-subtle">
          <Link to="/" className="hover:text-terracotta transition">
            Home
          </Link>
          <Link to="/guest/browse" className="hover:text-terracotta transition">
            Discover
          </Link>
          <Link to="/blog" className="hover:text-terracotta transition">
            Blog
          </Link>
          <Link to="/support" className="hover:text-terracotta transition">
            Support
          </Link>
          <div className="w-[1px] h-4 bg-charcoal/20" />
          <LanguageSelector
            currentLang={lang}
            onLanguageChange={(newLang) => {
              setLang(newLang);
              localStorage.setItem('preferredLanguage', newLang);
            }}
          />
        </div>

        {/* Right Actions */}
        <div className="hidden md:flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-premium px-5 py-2.5 rounded-2xl flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider"
              >
                <span>Dashboard</span>
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 border border-charcoal/10 rounded-2xl hover:bg-stone transition text-xs font-bold uppercase tracking-wider text-charcoal-light"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="btn-premium px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden p-2 text-charcoal hover:text-terracotta transition"
          aria-label="Open Menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col pt-6 pb-10 px-6 overflow-y-auto text-charcoal md:hidden">
          <div className="flex justify-between items-center mb-12">
            <div className="cursor-pointer" onClick={() => { setIsMobileMenuOpen(false); navigate('/'); }}>
              <img src="/logo.png" alt="X-Space360 Logo" className="h-8 w-auto object-contain" />
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-charcoal hover:text-terracotta transition p-2 bg-stone rounded-full">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex flex-col space-y-6 flex-1">
            <button
              onClick={() => { setIsMobileMenuOpen(false); navigate('/'); }}
              className="text-left text-2xl font-bold hover:text-terracotta transition py-2 border-b border-stone"
            >
              Home
            </button>
            <button
              onClick={() => { setIsMobileMenuOpen(false); navigate('/guest/browse'); }}
              className="text-left text-2xl font-bold hover:text-terracotta transition py-2 border-b border-stone"
            >
              Discover
            </button>
            <button
              onClick={() => { setIsMobileMenuOpen(false); navigate('/blog'); }}
              className="text-left text-2xl font-bold hover:text-terracotta transition py-2 border-b border-stone"
            >
              Blog
            </button>
            <button
              onClick={() => { setIsMobileMenuOpen(false); navigate('/support'); }}
              className="text-left text-2xl font-bold hover:text-terracotta transition py-2 border-b border-stone"
            >
              Support
            </button>

            {user ? (
              <div className="pt-6 flex flex-col space-y-4">
                <button
                  onClick={() => { setIsMobileMenuOpen(false); navigate('/dashboard'); }}
                  className="w-full btn-premium py-4 rounded-2xl text-center text-sm font-bold uppercase tracking-wider"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); handleSignOut(); }}
                  className="w-full py-4 border border-charcoal/10 rounded-2xl text-center text-sm font-bold uppercase tracking-wider text-charcoal-light hover:bg-stone transition"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }}
                className="w-full btn-premium py-4 rounded-2xl text-center text-sm font-bold uppercase tracking-wider"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hero Header Section */}
      <div className="relative pt-14 pb-14 md:pt-20 md:pb-20 bg-[#0C121D] text-white overflow-hidden border-b border-[#E0A51B]/20">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1450133064473-71024230f91b?q=80&w=2070')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0F172A] via-[#0F172A]/95 to-[#1E293B]/80" />
        
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center space-y-4">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-[#E0A51B]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Platform Governance</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white font-serif">
            {isLegalIndex ? 'X-Space360 Legal Policies' : (selectedDoc?.title || legalData.title || 'Legal Terms & Platform Policies')}
          </h1>
          <p className="text-xs md:text-sm text-white/70 max-w-2xl mx-auto font-medium">
            Version {legalData.version || '2026.1'} · Effective Date {legalData.effective_date || '2026-07-03'}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-10 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
          
          {/* Document Selector Sidebar */}
          <aside className="lg:sticky lg:top-28 h-fit rounded-3xl border border-sand-200 bg-white p-5 shadow-premium">
            <div className="flex items-center gap-3 pb-4 border-b border-sand-100 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-terracotta/10 text-terracotta flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-charcoal">Legal Policies</p>
                <p className="text-[11px] text-charcoal-muted font-semibold">{documents.length} Published Documents</p>
              </div>
            </div>
            
            <nav className="space-y-1.5">
              {documents.length === 0 && (
                <p className="px-3 py-4 text-xs text-charcoal-muted">No published legal policies are available.</p>
              )}
              {documents.map(doc => {
                const slug = doc.id === 'terms' || doc.id === 'privacy' || doc.id === 'refund-policy'
                  ? doc.id
                  : slugify(doc.title);
                const href = doc.id === 'terms'
                  ? '/terms'
                  : doc.id === 'privacy'
                    ? '/privacy'
                    : doc.id === 'refund-policy'
                      ? '/refund-policy'
                      : `/legal/${slug}`;
                const active = selectedDoc?.id === doc.id || selectedDoc?.title === doc.title;
                return (
                  <Link
                    key={`${doc.id}-${doc.title}`}
                    to={href}
                    className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                      active
                        ? 'bg-terracotta text-white shadow-premium'
                        : 'text-charcoal-light hover:bg-stone hover:text-charcoal'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="truncate">{doc.title}</span>
                    </span>
                    {doc.status === 'Active' && <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-white' : 'text-emerald-600'}`} />}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Document Content View */}
          <section className="rounded-3xl border border-sand-200 bg-white p-6 md:p-10 shadow-premium">
            {loading ? (
              <p className="text-charcoal-muted text-sm font-semibold">Loading legal document...</p>
            ) : selectedDoc ? (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-8 border-b border-sand-100">
                  <div>
                    <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-terracotta bg-terracotta/10 px-3 py-1 rounded-full mb-2">
                      {selectedDoc?.type === 'agreement' ? 'Platform Agreement' : 'Official Policy'}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-charcoal tracking-tight">
                      {selectedDoc?.title}
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold w-fit">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Verified Active
                  </span>
                </div>

                <article className="prose max-w-none font-sans">
                  <ReactMarkdown components={markdownComponents}>
                    {selectedDoc?.text || 'No content is available for this legal document.'}
                  </ReactMarkdown>
                </article>
              </>
            ) : (
              <div className="text-center py-16">
                <Lock className="w-12 h-12 text-sand-300 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-charcoal">No Legal Policy Selected</h2>
                <p className="text-sm text-charcoal-muted mt-2">Please select a policy document from the menu.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative overflow-hidden border-t border-white/10 bg-[#081321] text-white shadow-premium mt-16">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0b1b2e_0%,#07111e_48%,#101722_100%)] pointer-events-none" />
        <div className="relative z-10 w-full px-6 py-12 md:px-10 lg:px-14 xl:px-20">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.45fr_repeat(4,1fr)_1.2fr] lg:gap-12">
            <div className="max-w-xs">
              <button
                type="button"
                className="mb-6 flex items-center cursor-pointer"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label="Back to top"
              >
                <img src="/logo.png" alt="X-Space360 Logo" className="h-10 w-auto object-contain logo-white" />
              </button>
              <p className="text-sm font-medium leading-7 text-white/62">
                {footerData.brand_description}
              </p>
              <div className="mt-7 flex items-center gap-3">
                {[
                  { icon: Facebook, url: footerData.facebook_link, label: 'Facebook' },
                  { icon: Instagram, url: footerData.instagram_link, label: 'Instagram' },
                  { icon: Youtube, url: footerData.youtube_link, label: 'Youtube' },
                ].filter(social => social.url).map((social) => {
                  const IconComponent = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/14 bg-white/[0.03] text-white/70 transition hover:border-[#E0A51B] hover:text-[#E0A51B]"
                    >
                      <IconComponent className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </div>

            {footerSections.map((section) => (
              <div key={section.heading} className="min-w-0">
                <h5 className="mb-5 inline-flex flex-col gap-2 text-[11px] font-bold uppercase text-white">
                  {section.heading}
                  <span className="h-0.5 w-7 rounded-full bg-[#E0A51B]" />
                </h5>
                <ul className="space-y-4">
                  {section.items.map((item) => (
                    <li key={`${section.heading}-${item.label}`}>
                      <button
                        type="button"
                        onClick={() => handleFooterSectionClick(section, item)}
                        className="text-left text-sm font-medium text-white/62 transition hover:text-[#E0A51B]"
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="min-w-0">
              <h5 className="mb-5 inline-flex flex-col gap-2 text-[11px] font-bold uppercase text-white">
                Contact
                <span className="h-0.5 w-7 rounded-full bg-[#E0A51B]" />
              </h5>
              <div className="space-y-5 text-sm font-medium text-white/62">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#E0A51B]" />
                  <span>{footerData.location || 'Nashik, Maharashtra'}, India</span>
                </div>
                <a href={`mailto:${footerData.email || 'support@x-space360.com'}`} className="flex items-center gap-3 transition hover:text-[#E0A51B]">
                  <Mail className="h-4 w-4 flex-shrink-0 text-[#E0A51B]" />
                  <span className="break-all">{footerData.email || 'support@x-space360.com'}</span>
                </a>
                <a href={`tel:${(footerData.phone || '+91 12345 67890').replace(/\s+/g, '')}`} className="flex items-center gap-3 transition hover:text-[#E0A51B]">
                  <Phone className="h-4 w-4 flex-shrink-0 text-[#E0A51B]" />
                  <span>{footerData.phone || '+91 12345 67890'}</span>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-11 border-t border-white/10 pt-7 text-center">
            <div className="text-xs font-bold uppercase text-white/52">
              <p>© 2026 X-SPACE360. Owned & Operated by Golden Rich Financial Solutions & Real Estate Solutions Pvt Ltd.</p>
              <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2">
                {footerLegalItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleFooterSectionClick({ heading: 'Legal' }, item)}
                    className="transition hover:text-[#E0A51B]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Footer Text Popup Modal */}
      {footerPopup && (
        <div className="fixed inset-0 z-[120] bg-charcoal/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-elevated border border-gray-100 w-full max-w-xl max-h-[85vh] overflow-y-auto p-7 md:p-9 animate-scale-in">
            <div className="flex items-start justify-between gap-6 mb-6">
              <h3 className="text-2xl font-bold tracking-tight text-charcoal">{footerPopup.title}</h3>
              <button
                type="button"
                onClick={() => setFooterPopup(null)}
                className="w-10 h-10 rounded-full border border-gray-100 text-charcoal-muted hover:text-charcoal hover:bg-stone transition flex items-center justify-center"
                aria-label="Close footer details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto mt-4 pr-1">
              <LegalDocument text={footerPopup.text} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalPage;
