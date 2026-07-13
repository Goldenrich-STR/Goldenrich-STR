import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, MapPin, Mail, Phone, ShieldCheck, CheckCircle2, Sparkles, 
  Facebook, Instagram, Youtube, Menu, X, ArrowRight, Compass, Users, Milestone, Award
} from 'lucide-react';
import apiClient, { getImageUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import LanguageSelector from '../components/LanguageSelector';

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
      { label: 'Short-term Stays', action_type: 'link', link: '/guest/browse', text: '' }
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
    <div className="min-h-screen bg-sand-50 font-sans text-charcoal">
      <SEO title={`About Us | X-Space360`} description={t('aboutSubtitle')} />

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
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/blog'); }} className="hover:text-terracotta transition">
            Blog
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
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B1522]/60 via-[#0B1522]/90 to-sand-50" />
        
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center space-y-6">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md border border-white/20 px-4.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-[#E0A51B] animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Discover X-Space360</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight font-serif text-white">
            {t('aboutTitle')}
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed font-light">
            {t('aboutSubtitle')}
          </p>
        </div>
      </div>

      {/* Story & Vision Section */}
      <div className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
        <div className="space-y-6">
          <div className="flex items-center space-x-3 text-terracotta">
            <Milestone className="w-6 h-6" />
            <h2 className="text-2xl font-bold tracking-tight text-charcoal">{t('ourStory')}</h2>
          </div>
          <p className="text-charcoal-light leading-relaxed text-base font-medium">
            {t('storyText')}
          </p>
          <div className="p-6 rounded-3xl bg-white border border-stone shadow-subtle flex items-start gap-4">
            <Award className="w-10 h-10 text-[#E0A51B] flex-shrink-0" />
            <div>
              <h4 className="font-bold text-charcoal text-sm uppercase tracking-wider mb-1">Golden Rich Financial Group</h4>
              <p className="text-xs text-charcoal-muted leading-relaxed font-medium">
                Our parent entity, Golden Rich Financial Solutions and Real Estate Solutions Pvt Ltd, provides institutional backing, regulatory compliance, and market confidence.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8 bg-stone/50 p-8 rounded-3xl border border-stone">
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-charcoal uppercase tracking-widest flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-terracotta" />
              <span>{t('vision')}</span>
            </h3>
            <p className="text-sm text-charcoal-light leading-relaxed font-medium">
              {t('visionText')}
            </p>
          </div>
          <div className="w-full h-[1px] bg-charcoal/10" />
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-charcoal uppercase tracking-widest flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sage" />
              <span>{t('mission')}</span>
            </h3>
            <p className="text-sm text-charcoal-light leading-relaxed font-medium">
              {t('missionText')}
            </p>
          </div>
        </div>
      </div>

      {/* Core Values Section */}
      <div className="bg-white border-y border-stone py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-extrabold tracking-tight text-charcoal">{t('coreValues')}</h2>
            <p className="text-sm text-charcoal-muted font-medium">The foundational pillars that support our curate, lock, and verify operational standards.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-stone/40 border border-stone/60 space-y-4 hover:shadow-premium hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-terracotta/10 text-terracotta flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-charcoal">{t('valueTrust')}</h3>
              <p className="text-sm text-charcoal-muted leading-relaxed font-medium">
                {t('valueTrustText')}
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-stone/40 border border-stone/60 space-y-4 hover:shadow-premium hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-[#E0A51B]/10 text-[#E0A51B] flex items-center justify-center">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-charcoal">{t('valueDesign')}</h3>
              <p className="text-sm text-charcoal-muted leading-relaxed font-medium">
                {t('valueDesignText')}
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-stone/40 border border-stone/60 space-y-4 hover:shadow-premium hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-sage/10 text-sage flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-charcoal">{t('valueSeamless')}</h3>
              <p className="text-sm text-charcoal-muted leading-relaxed font-medium">
                {t('valueSeamlessText')}
              </p>
            </div>
          </div>
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
                {footerData.brand_description || t('footerSub')}
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
            <div className="text-sm text-charcoal-light leading-relaxed whitespace-pre-wrap font-medium">
              {footerPopup.text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AboutUs;
