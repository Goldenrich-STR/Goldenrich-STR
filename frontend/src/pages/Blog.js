import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { 
  Building2, MapPin, Mail, Phone, ShieldCheck, CheckCircle2, Sparkles, 
  Facebook, Instagram, Youtube, Menu, X, ArrowRight, BookOpen, Clock, User
} from 'lucide-react';
import apiClient, { getImageUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import LanguageSelector from '../components/LanguageSelector';
import LegalDocument from '../components/LegalDocument';
import Footer from '../components/Footer';
import { formatContentWithBullets, markdownComponents } from '../lib/formatContent';

const FALLBACK_BLOG_IMAGES = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=800'
];

const blogSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "@id": "https://x-space360.in/blog#blog",
  url: "https://x-space360.in/blog",
  name: "X-Space360 Travel and Property Blog",
  description:
    "Read travel guides, property booking tips, host resources, workspace insights and event venue ideas.",
  publisher: {
    "@id": "https://x-space360.in/#organization",
  },
  inLanguage: "en-IN",
};

const SITE_URL = "https://x-space360.in";
const DEFAULT_BLOG_KEYWORDS = [
  "travel blog India",
  "villa booking guide",
  "host tips",
  "workspace guide",
  "event venue guide",
];

const toAbsoluteUrl = (url) => {
  if (!url) return `${SITE_URL}/images/xspace360-og-image.jpg`;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}/${String(url).replace(/^\/+/, "")}`;
};

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
  phone: '+91 919225586010',
  facebook_link: 'https://facebook.com',
  instagram_link: 'https://instagram.com',
  youtube_link: 'https://youtube.com',
  footer_sections: [
    { heading: 'For Guests', items: [
      { label: 'Browse Collections', action_type: 'link', link: '/guest/browse', text: '' },
      { label: 'All Destinations', action_type: 'link', link: '/guest/browse', text: '' },
      { label: 'Short-term Stays', action_type: 'link', link: '/property/residential', text: '' }
    ] },
    { heading: 'For Hosts', items: [
      { label: 'List Your Space', action_type: 'link', link: '/list-your-property', text: '' },
      { label: 'Become a Host', action_type: 'link', link: '/register/host', text: '' }
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

const slugify = (value) => String(value || '')
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const Blog = () => {
  const navigate = useNavigate();
  const { slug: postSlug } = useParams();
  const { user, logout } = useAuth();
  const [lang, setLang] = useState(localStorage.getItem('preferredLanguage') || 'en');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cmsContent, setCmsContent] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('guest_wishlist')) || [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    const syncWishlist = () => {
      try {
        setWishlist(JSON.parse(localStorage.getItem('guest_wishlist')) || []);
      } catch (e) {
        setWishlist([]);
      }
    };
    window.addEventListener('focus', syncWishlist);
    window.addEventListener('storage', syncWishlist);
    syncWishlist();
    return () => {
      window.removeEventListener('focus', syncWishlist);
      window.removeEventListener('storage', syncWishlist);
    };
  }, []);
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
  const legalData = { ...footerData, ...(cmsContent?.legal_terms || {}) };
  
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
    ...(Array.isArray(legalData.custom_policies)
      ? legalData.custom_policies
          .filter(policy => policy?.status === 'Active' && policy?.text)
          .filter(policy => Array.isArray(policy.placements) ? policy.placements.includes('landing_footer') : true)
          .map(policy => ({ label: policy.label || policy.title || 'Legal Policy', action_type: 'text', link: '', text: policy.text }))
      : []),
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
      if (item.link === '/host/list-property' || item.link === '/list-your-property') {
        navigate(user ? '/host/list-property' : '/list-your-property');
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

  const blogSettings = {
    page_eyebrow: 'X-SPACE360 JOURNAL',
    page_title: 'The Journal',
    page_subtitle: 'Curated insights, local travel guides, and operational updates for short-term renting and event planning.',
    page_hero_image_url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800',
    ...(cmsContent?.blog || {})
  };

  const blogPosts = useMemo(() => {
    if (cmsContent?.blog && Array.isArray(cmsContent.blog.posts)) {
      const visibleCmsBlogPosts = cmsContent.blog.posts.filter(post => post?.is_active !== false);
      return visibleCmsBlogPosts.map((post, idx) => {
        const fallbackImg = FALLBACK_BLOG_IMAGES[idx % FALLBACK_BLOG_IMAGES.length];
        const postImg = post.image_url || post.img || post.featuredImage || fallbackImg;
        return {
          id: post.id || `cms-post-${idx}`,
          title: post.title || 'Untitled',
          excerpt: post.excerpt || '',
          content: post.content || '',
          date: post.date || 'June 2026',
          author: post.author || 'Editorial Desk',
          authorName: post.authorName || post.author || 'Editorial Desk',
          category: post.category || 'Travel and Property',
          image_url: postImg,
          featuredImage: postImg,
          metaTitle: post.metaTitle || post.seo?.title || post.title || 'X-Space360 Blog',
          metaDescription: post.metaDescription || post.seo?.description || post.excerpt || 'Read travel guides, property booking tips, host resources, workspace insights and event venue ideas.',
          keywords: Array.isArray(post.keywords) ? post.keywords : (Array.isArray(post.seo?.keywords) ? post.seo.keywords : DEFAULT_BLOG_KEYWORDS),
          publishedAt: post.publishedAt || post.date || new Date().toISOString(),
          updatedAt: post.updatedAt || post.updated_at || post.publishedAt || post.date,
          slug: post.slug,
          read_time: post.read_time || '5 min read'
        };
      });
    }
    return DEFAULT_BLOG_POSTS;
  }, [cmsContent]);

  const getPostSlug = (post) => post?.slug || slugify(post?.title) || post?.id;
  const getPostKeywords = (post) => {
    if (Array.isArray(post?.keywords) && post.keywords.length) return post.keywords;
    if (typeof post?.keywords === 'string' && post.keywords.trim()) {
      return post.keywords.split(',').map(keyword => keyword.trim()).filter(Boolean);
    }
    return DEFAULT_BLOG_KEYWORDS;
  };

  const selectedPostCanonicalPath = selectedPost ? `/blog/${getPostSlug(selectedPost)}` : '/blog';
  const selectedPostImage = selectedPost ? toAbsoluteUrl(selectedPost.featuredImage || selectedPost.image_url) : null;
  const selectedPostKeywords = selectedPost ? getPostKeywords(selectedPost) : DEFAULT_BLOG_KEYWORDS;
  const blogPostingSchema = selectedPost ? {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${SITE_URL}${selectedPostCanonicalPath}#article`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}${selectedPostCanonicalPath}`,
    },
    headline: selectedPost.title,
    description: selectedPost.metaDescription || selectedPost.excerpt,
    image: [selectedPostImage],
    datePublished: selectedPost.publishedAt || selectedPost.date,
    dateModified: selectedPost.updatedAt || selectedPost.publishedAt || selectedPost.date,
    author: {
      "@type": "Person",
      name: selectedPost.authorName || selectedPost.author || "X-Space360 Editor",
    },
    publisher: {
      "@id": "https://x-space360.in/#organization",
    },
    articleSection: selectedPost.category || "Travel and Property",
    keywords: selectedPostKeywords.join(", "),
    inLanguage: "en-IN",
  } : null;

  useEffect(() => {
    if (!postSlug) {
      return;
    }
    const matchedPost = blogPosts.find((post) => getPostSlug(post) === postSlug || String(post.id) === postSlug);
    setSelectedPost(matchedPost || null);
  }, [postSlug, blogPosts]);

  const openPost = (post) => {
    setSelectedPost(post);
    navigate(`/blog/${getPostSlug(post)}`);
  };

  const closePost = () => {
    setSelectedPost(null);
    if (postSlug) {
      navigate('/blog');
    }
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
    <div className="min-h-screen bg-sand-50 font-sans text-charcoal">
      <SEO
        title={selectedPost ? (selectedPost.metaTitle || selectedPost.title) : "Travel, Stays & Property Management Blog | X-Space360"}
        description={selectedPost
          ? (selectedPost.metaDescription || selectedPost.excerpt || "Read X-Space360 travel, property and host insights.")
          : "Explore travel guides, stay ideas, destination tips and short-term rental property management insights from X-Space360."}
        path={selectedPost ? selectedPostCanonicalPath : "/blog"}
        appendSiteName={false}
        image={selectedPost ? selectedPostImage : undefined}
        type={selectedPost ? "article" : "website"}
        keywords={selectedPost ? selectedPostKeywords : DEFAULT_BLOG_KEYWORDS}
        schema={selectedPost ? blogPostingSchema : blogSchema}
      />

      {/* Header / Navbar */}
      <nav className="absolute top-0 left-0 right-0 w-full z-50 flex justify-between items-center text-charcoal px-6 md:px-12 lg:px-20 h-20 bg-white/80 backdrop-blur-md border-b border-stone">
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
          <Link to="/about-us" className="hover:text-terracotta transition">
            About Us
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
            <div className="py-2 border-b border-stone flex items-center">
              <LanguageSelector
                mode="inline"
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

      {/* Premium Warm Hero Header Section */}
      <div className="relative pt-32 pb-16 md:pt-40 md:pb-24 bg-gradient-to-b from-[#FAF8F5] via-[#F5F2EB] to-[#FAF8F5] text-charcoal overflow-hidden border-b border-stone-200">
        <div className="absolute inset-0 bg-[radial-gradient(#E0A51B_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center space-y-5">
          <div className="inline-flex items-center space-x-2 bg-terracotta/10 border border-terracotta/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-terracotta">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{blogSettings.page_eyebrow || 'X-SPACE360 JOURNAL'}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight font-serif text-charcoal">
            {selectedPost ? (blogSettings.page_title || 'The Journal') : 'X-Space360 Blog'}
          </h1>
          <p className="text-base md:text-xl text-charcoal-light max-w-2xl mx-auto leading-relaxed font-normal">
            {blogSettings.page_subtitle || 'Curated insights, local travel guides, and operational updates for short-term renting.'}
          </p>
        </div>
      </div>

      {/* Blog Posts Grid - Clean Minimalist Style */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="space-y-4 mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-charcoal font-sans">
            Plan smart, explore more
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {blogPosts.map((post) => (
            <div 
              key={post.id}
              onClick={() => openPost(post)}
              className="cursor-pointer group flex flex-col space-y-3"
            >
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-stone border border-stone-200 shadow-sm">
                <img 
                  src={getImageUrl(post.image_url)} 
                  alt={post.title} 
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                />
              </div>
              <div className="space-y-1 pt-1">
                <h3 className="text-xl md:text-2xl font-bold text-charcoal leading-snug group-hover:text-terracotta transition-colors duration-200">
                  {post.title}
                </h3>
                <p className="text-xs font-semibold text-charcoal-muted tracking-tight">
                  {post.date} • <span className="text-terracotta font-bold">{post.author}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modern Sleek Dark Footer Section */}
      <Footer cmsContent={cmsContent} />
    </div>
  );
};

export default Blog;
