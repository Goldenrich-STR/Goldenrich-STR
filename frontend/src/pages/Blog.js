import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, MapPin, Mail, Phone, ShieldCheck, CheckCircle2, Sparkles, 
  Facebook, Instagram, Twitter, Linkedin, Menu, X, ArrowRight, BookOpen, Clock, User
} from 'lucide-react';
import apiClient, { getImageUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import LanguageSelector from '../components/LanguageSelector';

const DEFAULT_BLOG_POSTS = [
  {
    id: 'p1',
    title: 'The Future of Short-Term Rentals in India',
    excerpt: 'How shifting preferences and hybrid work models are driving growth in STR spaces.',
    date: 'June 10, 2026',
    author: 'Amit Sharma',
    image_url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800',
    read_time: '6 min read'
  },
  {
    id: 'p2',
    title: 'Design Tips to Maximize Your Property Yield',
    excerpt: 'Curate your space to appeal to high-end travelers with styling and amenity upgrades.',
    date: 'June 05, 2026',
    author: 'Neha Patel',
    image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800',
    read_time: '5 min read'
  },
  {
    id: 'p3',
    title: 'Top 5 Weekend Escapes Near Mumbai & Nashik',
    excerpt: 'Explore the most beautiful villa retreats and holiday home collections for your next vacation.',
    date: 'May 28, 2026',
    author: 'Vikram Singh',
    image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800',
    read_time: '7 min read'
  }
];

const DEFAULT_FOOTER_DATA = {
  brand_description: 'Redefining short-term rentals in India through curation, technology, and superior service.',
  location: 'Nashik, Maharashtra',
  email: 'support@x-space360.com',
  phone: '+91 8484826247',
  facebook_link: 'https://facebook.com',
  instagram_link: 'https://instagram.com',
  twitter_link: 'https://twitter.com',
  linkedin_link: 'https://linkedin.com',
  footer_sections: [
    { heading: 'For Guests', items: [
      { label: 'Browse Collections', action_type: 'link', link: '/guest/browse', text: '' },
      { label: 'All Destinations', action_type: 'link', link: '/guest/browse', text: '' },
      { label: 'Short-term Stays', action_type: 'link', link: '/guest/browse', text: '' }
    ] },
    { heading: 'For Hosts', items: [
      { label: 'List Your Space', action_type: 'link', link: '/host/list-property', text: '' },
      { label: 'Become a Host', action_type: 'link', link: '/register', text: '' }
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
  ],
  privacy_label: 'Privacy Policy',
  privacy_text: 'X-Space360 respects your privacy. We collect only the information needed to manage accounts, property listings, bookings, support, verification, and secure platform operations.',
  terms_label: 'Terms & Conditions',
  terms_text: 'By using X-Space360, users agree to follow booking, listing, verification, payment, cancellation, and platform conduct rules published by X-Space360.',
  checkin_label: 'Check-in Instructions',
  checkin_text: 'Standard check-in time starts at 2:00 PM. Please present your valid Government ID upon arrival. Quiet hours are from 10:00 PM to 7:00 AM.'
};

const Blog = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [lang, setLang] = useState(localStorage.getItem('preferredLanguage') || 'en');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cmsContent, setCmsContent] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [footerPopup, setFooterPopup] = useState(null);

  useEffect(() => {
    const fetchCMS = async () => {
      try {
        const response = await apiClient.get('/cms/landing-page');
        setCmsContent(response.data);
      } catch (err) {
        console.error("Failed to fetch CMS content:", err);
      }
    };
    fetchCMS();
  }, []);

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
    { label: footerData.privacy_label || 'Privacy Policy', action_type: 'text', link: '', text: footerData.privacy_text || DEFAULT_FOOTER_DATA.privacy_text },
    { label: footerData.terms_label || 'Terms & Conditions', action_type: 'text', link: '', text: footerData.terms_text || DEFAULT_FOOTER_DATA.terms_text },
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
        navigate(user ? item.link : '/register');
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

  const blogPosts = Array.isArray(cmsContent?.blog?.posts) && cmsContent.blog.posts.length > 0
    ? cmsContent.blog.posts.map((post, idx) => ({
        id: post.id || `cms-post-${idx}`,
        title: post.title || 'Untitled',
        excerpt: post.excerpt || '',
        date: post.date || 'June 2026',
        author: post.author || 'Editorial Desk',
        image_url: post.image_url || post.img || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800',
        read_time: post.read_time || '5 min read'
      }))
    : DEFAULT_BLOG_POSTS;

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-sand-50 font-sans text-charcoal">
      <SEO title={`The Journal | X-Space360 Blog`} description="Discover curated perspectives, design tips, and weekend getaway guides." />

      {/* Header / Navbar */}
      <nav className="absolute top-0 left-0 right-0 w-full z-50 flex justify-between items-center text-charcoal px-6 md:px-12 lg:px-20 h-20 bg-white/80 backdrop-blur-md border-b border-stone">
        <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
          <img src="/logo.png" alt="X-Space360 Logo" className="h-8 md:h-10 w-auto object-contain" />
        </div>

        {/* Center Pill Links */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-12 items-center px-8 space-x-6 font-semibold text-[11px] uppercase tracking-widest text-charcoal bg-stone/80 backdrop-blur-md border border-stone-200 rounded-full shadow-subtle">
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="hover:text-terracotta transition">
            Home
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/guest/browse'); }} className="hover:text-terracotta transition">
            Discover
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/about-us'); }} className="hover:text-terracotta transition">
            About Us
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/support'); }} className="hover:text-terracotta transition">
            Support
          </a>
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
                className="btn-premium px-5 py-2.5 rounded-2xl flex items-center space-x-1.5 text-xs font-bold tracking-tight uppercase tracking-wider"
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
              onClick={() => { setIsMobileMenuOpen(false); navigate('/about-us'); }}
              className="text-left text-2xl font-bold hover:text-terracotta transition py-2 border-b border-stone"
            >
              About Us
            </button>
            <button
              onClick={() => { setIsMobileMenuOpen(false); navigate('/support'); }}
              className="text-left text-2xl font-bold hover:text-terracotta transition py-2 border-b border-stone"
            >
              Support
            </button>
            <div className="py-2 border-b border-stone flex items-center justify-between">
              <span className="text-2xl font-bold">Language</span>
              <LanguageSelector
                currentLang={lang}
                onLanguageChange={(newLang) => {
                  setLang(newLang);
                  localStorage.setItem('preferredLanguage', newLang);
                }}
              />
            </div>

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
      <div className="relative pt-32 pb-20 md:pt-40 md:pb-28 bg-[#0B1522] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B1522]/60 via-[#0B1522]/90 to-sand-50" />
        
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center space-y-6">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md border border-white/20 px-4.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-[#E0A51B] animate-pulse">
            <BookOpen className="w-3.5 h-3.5" />
            <span>X-SPACE360 JOURNAL</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight font-serif text-white">
            The Journal
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed font-light font-medium">
            Curated insights, local travel guides, and operational updates for short-term renting and event planning.
          </p>
        </div>
      </div>

      {/* Blog Posts Grid */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
            <div 
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="bg-white rounded-3xl overflow-hidden border border-stone shadow-subtle hover:shadow-premium hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col h-full group"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-charcoal">
                <img 
                  src={getImageUrl(post.image_url)} 
                  alt={post.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute bottom-4 left-4 px-2.5 py-1 rounded-full bg-charcoal/60 backdrop-blur-md text-[9px] font-bold tracking-tight uppercase tracking-widest text-white flex items-center gap-1 shadow-sm">
                  <Clock className="w-3 h-3 text-[#E0A51B]" />
                  {post.read_time}
                </span>
              </div>
              <div className="p-6.5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-terracotta">
                    <span>Journal</span>
                    <span>•</span>
                    <span className="text-charcoal-muted">{post.date}</span>
                  </div>
                  <h3 className="text-lg font-bold text-charcoal leading-snug group-hover:text-terracotta transition duration-300">
                    {post.title}
                  </h3>
                  <p className="text-xs text-charcoal-light font-medium leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-stone">
                  <div className="flex items-center space-x-2 text-xs font-bold text-charcoal-muted uppercase tracking-wider">
                    <div className="w-6 h-6 rounded-full bg-sage text-white flex items-center justify-center text-[10px] font-bold">
                      {post.author?.[0] || 'A'}
                    </div>
                    <span>{post.author}</span>
                  </div>
                  <span className="text-xs font-bold text-terracotta flex items-center gap-1 group-hover:gap-2 transition-all duration-300 uppercase tracking-widest">
                    <span>Read Article</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative overflow-hidden border-t border-white/10 bg-[#081321] text-white shadow-premium">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0b1b2e_0%,#07111e_48%,#101722_100%)] pointer-events-none" />
        <div className="relative z-10 w-full px-6 py-12 md:px-10 lg:px-14 xl:px-20">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.45fr_repeat(4,1fr)_1.2fr] lg:gap-12">
            <div className="max-w-xs">
              <button
                type="button"
                className="mb-6 flex items-center"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label="Back to top"
              >
                <img src="/logo.png" alt="X-Space360 Logo" className="h-10 w-auto object-contain logo-white" />
              </button>
              <p className="text-sm font-medium leading-7 text-white/62">
                {footerData.brand_description || 'Redefining short-term rentals in India through curation, technology, and superior service.'}
              </p>
              <div className="mt-7 flex items-center gap-3">
                {[
                  { icon: Facebook, url: footerData.facebook_link || 'https://facebook.com', label: 'Facebook' },
                  { icon: Instagram, url: footerData.instagram_link || 'https://instagram.com', label: 'Instagram' },
                  { icon: Twitter, url: footerData.twitter_link || 'https://twitter.com', label: 'Twitter' },
                  { icon: Linkedin, url: footerData.linkedin_link || 'https://linkedin.com', label: 'LinkedIn' },
                ].map((social) => {
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

      {/* Blog Post Detail Modal */}
      {selectedPost && (
        <div 
          className="fixed inset-0 bg-charcoal/70 backdrop-blur-md flex items-center justify-center z-[99999] p-4 md:p-6 transition-all duration-300 animate-fade-in" 
          onClick={() => setSelectedPost(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-5xl w-full max-h-[85vh] md:max-h-[80vh] overflow-hidden shadow-elevated border border-gray-100 flex flex-col md:flex-row relative animate-scale-up" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Column: Image Banner (Desktop) / Top Banner (Mobile) */}
            <div className="relative w-full md:w-[42%] h-[240px] md:h-auto overflow-hidden bg-charcoal shrink-0">
              <img 
                src={getImageUrl(selectedPost.image_url)} 
                alt={selectedPost.title} 
                className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-charcoal/90 via-charcoal/40 to-transparent z-10"></div>
              
              <div className="absolute bottom-6 left-6 right-6 z-20 text-white">
                <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold tracking-tight uppercase tracking-widest text-white mb-3 shadow-sm">
                  {selectedPost.read_time}
                </span>
                <h4 className="text-lg md:text-xl font-bold tracking-tight font-serif italic text-sand-100 leading-tight">
                  "Curated perspectives on short-term rentals and spaces."
                </h4>
              </div>
            </div>

            {/* Right Column: Article Details & Content */}
            <div className="flex-1 flex flex-col min-w-0 relative h-[calc(85vh-240px)] md:h-auto">
              <div className="flex items-center justify-between p-6 md:p-8 pb-4 border-b border-stone">
                <div className="flex items-center space-x-2 text-xs font-bold tracking-tight text-terracotta uppercase tracking-[0.2em]">
                  <span>Journal</span>
                  <span className="text-charcoal-muted font-normal">•</span>
                  <span className="text-charcoal-muted">{selectedPost.date}</span>
                </div>
                
                <button
                  onClick={() => setSelectedPost(null)}
                  className="w-10 h-10 rounded-full bg-gray-50 hover:bg-terracotta hover:text-white flex items-center justify-center transition-all text-charcoal shadow-sm hover:scale-[1.02] active:scale-95"
                  title="Close article"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Article Text */}
              <div className="overflow-y-auto px-6 md:px-8 py-6 custom-scrollbar flex-1 space-y-6">
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-charcoal tracking-tight leading-tight">
                  {selectedPost.title}
                </h3>

                <div className="flex items-center space-x-3 bg-stone border border-stone rounded-2xl p-4">
                  <div className="w-10 h-10 rounded-full bg-sage text-white flex items-center justify-center text-sm font-bold tracking-tight shadow-sm shrink-0">
                    {selectedPost.author?.[0] || 'A'}
                  </div>
                  <div>
                    <p className="text-sm font-bold tracking-tight text-charcoal leading-tight">{selectedPost.author}</p>
                    <p className="text-[11px] text-charcoal-muted font-bold uppercase tracking-wider mt-0.5">X-Space360 Editorial Desk</p>
                  </div>
                </div>

                <div className="text-charcoal-light font-semibold text-sm md:text-base leading-relaxed space-y-5">
                  {selectedPost.id === 'p1' ? (
                    <>
                      <p className="first-letter:text-5xl first-letter:font-bold tracking-tight first-letter:text-terracotta first-letter:mr-3 first-letter:float-left">
                        The real estate landscape is undergoing a massive paradigm shift. Traditional long-term leasing, once the gold standard of property investment, is rapidly losing ground to the dynamic world of short-term rentals (STRs). With the rise of hybrid work models, digital nomadism, and a growing consumer preference for unique, home-like experiences over standardized hotel rooms, properties listed on platforms like X-Space360 are seeing unprecedented demand.
                      </p>
                      <p>
                        What makes short-term renting so lucrative? The math is simple but powerful. Instead of locking in a fixed monthly rent for 11 or 24 months, hosts can optimize pricing daily, weekly, or hourly based on real-time market demand. During peak holiday seasons, weekend getaways, or major local conferences, daily rates can surge, enabling hosts to earn up to 3x more monthly revenue compared to traditional tenancy. Even with average occupancy rates around 60-70%, the net income yields are substantially higher.
                      </p>
                      <p className="bg-sage/10 border-l-4 border-sage p-4 rounded-r-xl italic font-serif text-charcoal font-medium my-6">
                        "Short-term renting isn't just about yielding higher returns; it's about retaining absolute control over your asset, choosing when to host, and ensuring top-tier maintenance under our strict verification guidelines."
                      </p>
                      <p>
                        Furthermore, platforms like X-Space360 eliminate the typical headaches associated with property hosting. Through automated calendar syncing (such as iCal feed integrations), verified digital KYC (using Aadhaar and secure mobile OTPs), and secure checkout locks powered by double-signature Razorpay integrations, the risk of payment defaults or double-bookings is reduced to zero. Whether you own a luxury residential villa, a chic co-working space, or an event rooftop, unlocking your property's short-term potential is the ultimate way to build a robust, passive income stream in 2026.
                      </p>
                    </>
                  ) : selectedPost.id === 'p2' ? (
                    <>
                      <p className="first-letter:text-5xl first-letter:font-bold tracking-tight first-letter:text-terracotta first-letter:mr-3 first-letter:float-left">
                        Aesthetics are no longer optional—they are the key driver of your property's daily listing value. In a crowded marketplace, guests browse with their eyes first. If your listing features premium design, curated color palettes, and thoughtful lighting, it immediately commands attention. More importantly, as remote and hybrid work becomes a permanent fixture of modern professional life, integrating a functional, high-end workspace into your rental is one of the highest-ROI improvements you can make.
                      </p>
                      <p>
                        To design a five-star workspace, start with the color psychology. Move away from stark office whites or harsh primary colors. Instead, adopt a curated palette of warm sand, rich terracotta, and calming sage green. These organic tones feel premium, relaxed, and incredibly inviting in photos. Next, invest in an ergonomic chair that combines physical comfort with high-end style, paired with a spacious wooden desk. Position the workspace near natural light, but ensure you install adjustable warm-toned task lighting for late-night productivity sessions.
                      </p>
                      <p className="bg-terracotta/5 border-l-4 border-terracotta p-4 rounded-r-xl italic font-serif text-charcoal font-medium my-6">
                        "In premium lodging, a workspace is no longer a luxury addition; it is an expectations baseline. Seamless integration of ergonomics and high-speed tech justifies up to a 30% daily rate premium."
                      </p>
                      <p>
                        Finally, complement the physical design with seamless technology. A blazing-fast, dedicated Wi-Fi connection is non-negotiable. Provide universal charging docks, clean cable management, and a high-quality secondary monitor if possible. By elevating the workspace from a simple desk-in-a-corner to a dedicated, premium workstation, you transform your property into a prime destination for work-cations, justifying a much higher daily price point and earning glowing five-star reviews from every guest.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="first-letter:text-5xl first-letter:font-bold tracking-tight first-letter:text-terracotta first-letter:mr-3 first-letter:float-left">
                        {selectedPost.excerpt}
                      </p>
                      <p>
                        Travel trends show a dramatic increase in experiential leisure. Travelers are seeking spaces that tell a story, connect with local culture, and offer high-quality physical amenities in scenic settings. Discovering Nashik's winery retreats or Mumbai's private coastal terraces has never been more popular.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
            <div className="text-sm text-charcoal-light leading-relaxed whitespace-pre-wrap font-medium">
              {footerPopup.text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Blog;
