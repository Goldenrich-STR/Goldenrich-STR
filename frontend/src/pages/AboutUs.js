import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, MapPin, Mail, Phone, ShieldCheck, CheckCircle2, Sparkles, 
  Facebook, Instagram, Youtube, Menu, X, ArrowRight, Compass, Users, Milestone, Award
} from 'lucide-react';
import apiClient, { getImageUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import LanguageSelector from '../components/LanguageSelector';
import { organizationSchema } from '../lib/seoSchemas';
import LegalDocument from '../components/LegalDocument';
import Footer from '../components/Footer';

const TRANSLATIONS = {
  en: {
    aboutTitle: 'About Us',
    aboutSubtitle: 'Redefining short-term rentals in India through curation, technology, and superior service.',
    ourStory: 'Our Story',
    storyText: 'X-Space360 was founded with a clear vision: to create a curated portfolio of short-term rentals, event venues, and commercial spaces across India that offer guests an elevated standard of comfort, aesthetics, and service. Backed by Golden Rich Financial Solutions and Real Estate Solutions Pvt Ltd, we bridge the gap between traditional real estate leasing and high-quality, flexible rentals.',
    vision: 'Our Vision',
    visionText: 'To be India’s premier destination for curated living, working, and event spaces, known for absolute physical verification, design integrity, and seamless technology.',
    mission: 'Our Mission',
    missionText: 'To empower hosts to list high-yield spaces and provide guests with verified, high-quality environments, supported by on-site physical audits and smart booking systems.',
    coreValues: 'Core Values',
    valueTrust: 'Absolute Trust',
    valueTrustText: 'Every listing undergoes mandatory physical audit visits and geolocation verification by our Relationship Managers.',
    valueDesign: 'Curated Design',
    valueDesignText: 'We select spaces that feature exceptional interior design, premium amenities, and a human-crafted feel.',
    valueSeamless: 'Seamless Experience',
    valueSeamlessText: 'From 10-minute calendar locks to instant payouts and smart support, our technology makes renting effortless.',
    footerSub: 'Redefining short-term rentals in India through curation, technology, and superior service.'
  },
  hi: {
    aboutTitle: 'हमारे बारे में',
    aboutSubtitle: 'क्यूरेशन, तकनीक और बेहतर सेवा के माध्यम से भारत में शॉर्ट-टर्म रेंटल को फिर से परिभाषित करना।',
    ourStory: 'हमारी कहानी',
    storyText: 'एक्स-स्पेस360 की स्थापना एक स्पष्ट विज़न के साथ की गई थी: भारत भर में शॉर्ट-टर्म रेंटल, इवेंट वेन्यू और कमर्शियल स्पेस का एक क्यूरेटेड पोर्टफोलियो तैयार करना जो मेहमानों को आराम, सौंदर्यशास्त्र और सेवा का एक ऊंचा स्तर प्रदान करे। गोल्डन रिच फाइनेंशियल सॉल्यूशंस और रियल एस्टेट सॉल्यूशंस प्राइवेट लिमिटेड द्वारा समर्थित, हम पारंपरिक रियल एस्टेट लीजिंग और उच्च गुणवत्ता वाले, लचीले रेंटल के बीच के अंतर को पाटते हैं।',
    vision: 'हमारा दृष्टिकोण',
    visionText: 'भारत में क्यूरेटेड लिविंग, वर्किंग और इवेंट स्पेस के लिए प्रमुख गंतव्य बनना, जो पूर्ण भौतिक सत्यापन, डिज़ाइन अखंडता और सहज तकनीक के लिए जाना जाता है।',
    mission: 'हमारा मिशन',
    missionText: 'होस्ट को उच्च-उपज वाले स्पेस लिस्ट करने के लिए सशक्त बनाना और ऑन-साइट भौतिक ऑडिट और स्मार्ट बुकिंग सिस्टम द्वारा समर्थित सत्यापित, उच्च-गुणवत्ता वाले वातावरण के साथ मेहमानों को प्रदान करना।',
    coreValues: 'मुख्य मूल्य',
    valueTrust: 'पूर्ण विश्वास',
    valueTrustText: 'हमारे रिलेशनशिप मैनेजर्स द्वारा प्रत्येक लिस्टिंग का अनिवार्य भौतिक ऑडिट और जियोलोकेशन सत्यापन किया जाता है।',
    valueDesign: 'क्यूरेटेड डिज़ाइन',
    valueDesignText: 'हम उन स्पेस का चयन करते हैं जिनमें असाधारण इंटीरियर डिज़ाइन, प्रीमियम सुविधाएं और मानवीय स्पर्श होता है।',
    valueSeamless: 'सहज अनुभव',
    valueSeamlessText: '10-मिनट के कैलेंडर लॉक से लेकर त्वरित भुगतान और स्मार्ट सपोर्ट तक, हमारी तकनीक रेंटल को आसान बनाती है।',
    footerSub: 'क्यूरेशन, तकनीक और बेहतर सेवा के माध्यम से भारत में शॉर्ट-टर्म रेंटल को फिर से परिभाषित करना।'
  },
  mr: {
    aboutTitle: 'आमच्याबद्दल',
    aboutSubtitle: 'क्युरेशन, तंत्रज्ञान आणि उत्कृष्ट सेवेद्वारे भारतातील शॉर्ट-टर्म रेंटल पुन्हा परिभाषित करणे.',
    ourStory: 'आमची कथा',
    storyText: 'एक्स-स्पेस३६० ची स्थापना एका स्पष्ट ध्येयाने करण्यात आली होती: भारतभरात शॉर्ट-टर्म रेंटल, इव्हेंट व्हेन्यू आणि कमर्शियल स्पेसचा क्युरेटेड पोर्टफोलिओ तयार करणे जे पाहुण्यांना आराम, सौंदर्यशास्त्र आणि सेवेचा उच्च दर्जा देतात. गोल्डन रिच फायनान्शियल सोल्युशन्स आणि रिअल इस्टेट सोल्युशन्स प्रा. लि. द्वारे समर्थित, आम्ही पारंपारिक रिअल इस्टेट लीजिंग आणि उच्च-गुणवत्तेच्या, लवचिक रेंटल मधील अंतर भरून काढतो.',
    vision: 'आमचे व्हिजन',
    visionText: 'भारतातील क्युरेटेड लिव्हिंग, वर्किंग आणि इव्हेंट स्पेससाठी प्रमुख ठिकाण बनणे, जे पूर्ण भौतिक पडताळणी, डिझाइन अखंडता आणि अखंड तंत्रज्ञानासाठी ओळखले जाते.',
    mission: 'आमचे मिशन',
    missionText: 'होस्टना उच्च-उत्पन्न देणारे स्पेस लिस्ट करण्यासाठी सक्षम करणे आणि ऑन-साइट भौतिक ऑडिट आणि स्मार्ट बुकिंग सिस्टमद्वारे समर्थित सत्यापित, उच्च-गुणवत्तेचे वातावरण प्रदान करणे.',
    coreValues: 'मुख्य मूल्ये',
    valueTrust: 'पूर्ण विश्वास',
    valueTrustText: 'आमच्या रिलेशनशिप मॅनेजर्सद्वारे प्रत्येक लिस्टिंगची अनिवार्य भौतिक तपासणी आणि जिओलोकेशन पडताळणी केली जाते.',
    valueDesign: 'क्युरेटेड डिझाइन',
    valueDesignText: 'आम्ही अशा जागा निवडतो ज्यामध्ये उत्कृष्ट इंटीरियर डिझाइन, प्रीमियम सोयी-सुविधा आणि मानवी स्पर्श असतो.',
    valueSeamless: 'अखंड अनुभव',
    valueSeamlessText: '१०-मिनिटांच्या कॅलेंडर लॉकपासून ते झटपट पेआउट आणि स्मार्ट सपोर्टपर्यंत, आमचे तंत्रज्ञान भाड्याने देणे सुलभ करते.',
    footerSub: 'क्युरेशन, तंत्रज्ञान आणि उत्कृष्ट सेवेद्वारे भारतातील शॉर्ट-टर्म रेंटल पुन्हा परिभाषित करणे.'
  }
};

const aboutSchema = {
  "@context": "https://schema.org",
  "@graph": [
    organizationSchema,
    {
      "@type": "AboutPage",
      "@id": "https://x-space360.in/about-us#webpage",
      url: "https://x-space360.in/about-us",
      name: "About X-Space360",
      description:
        "Learn about X-Space360, its property booking ecosystem, mission, services and commitment to hosts and guests.",
      isPartOf: {
        "@id": "https://x-space360.in/#website",
      },
      about: {
        "@id": "https://x-space360.in/#organization",
      },
      inLanguage: "en-IN",
    },
  ],
};

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

const AboutUs = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [lang, setLang] = useState(localStorage.getItem('preferredLanguage') || 'en');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cmsContent, setCmsContent] = useState(null);
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

  const t = (key) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en']?.[key] || key;
  };

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
        title="About X-Space360 | Stays, Venues & Workspaces"
        description="Learn how X-Space360 helps guests find stays, event venues and workspaces across Nashik and nearby destinations."
        path="/about-us"
        appendSiteName={false}
        keywords={[
          "about X-Space360",
          "property booking platform India",
          "smart booking platform",
        ]}
        schema={aboutSchema}
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

      {/* Hero Header Section - Clean Trulia Style */}
      <div className="relative pt-32 pb-16 md:pt-44 md:pb-20 bg-[#FBFBFA] border-b border-gray-200">
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center space-y-6">
          <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-800 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Discover X-Space360</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-[56px] font-black tracking-tight font-sans text-[#0F4A33] leading-[1.1]">
            About X-Space360
          </h1>
          <p className="text-xl md:text-2xl text-gray-500 font-light leading-relaxed max-w-3xl mx-auto">
            {t('aboutSubtitle')}
          </p>
        </div>
      </div>

      {/* Story & Vision Section */}
      <div className="bg-white">
        <div className="max-w-5xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight text-[#0F4A33] font-sans">{t('ourStory')}</h2>
            <p className="text-gray-600 leading-relaxed text-lg font-light">
              {t('storyText')}
            </p>
            <div className="pt-4">
              <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-4">
                <Award className="w-8 h-8 text-[#6B1934] flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-1">Golden Rich Financial Group</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Our parent entity provides institutional backing, regulatory compliance, and market confidence.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8 bg-[#F0E5DE] p-8 md:p-10 rounded-3xl">
            <div className="space-y-3">
              <h3 className="text-sm font-black text-[#6B1934] uppercase tracking-widest mb-2">
                {t('vision')}
              </h3>
              <p className="text-xl text-gray-900 leading-relaxed font-serif font-medium">
                "{t('visionText')}"
              </p>
            </div>
            <div className="w-12 h-1 bg-[#0F4A33]/20" />
            <div className="space-y-3">
              <h3 className="text-sm font-black text-[#6B1934] uppercase tracking-widest mb-2">
                {t('mission')}
              </h3>
              <p className="text-xl text-gray-900 leading-relaxed font-serif font-medium">
                "{t('missionText')}"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Core Values Section */}
      <div className="bg-[#FBFBFA] border-t border-gray-200 py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[#0F4A33] font-sans">{t('coreValues')}</h2>
            <p className="text-lg text-gray-500 font-light">The foundational pillars that support our curate, lock, and verify operational standards.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-xl text-gray-900">{t('valueTrust')}</h3>
              <p className="text-gray-600 leading-relaxed font-light">
                {t('valueTrustText')}
              </p>
            </div>

            <div className="space-y-4 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <Compass className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-xl text-gray-900">{t('valueDesign')}</h3>
              <p className="text-gray-600 leading-relaxed font-light">
                {t('valueDesignText')}
              </p>
            </div>

            <div className="space-y-4 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-xl text-gray-900">{t('valueSeamless')}</h3>
              <p className="text-gray-600 leading-relaxed font-light">
                {t('valueSeamlessText')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer cmsContent={cmsContent} />
    </div>
  );
};

export default AboutUs;
