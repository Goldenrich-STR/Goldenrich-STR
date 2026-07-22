import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, MessageSquare, Mail, Phone, Search, ChevronRight, Send, Lock, HelpCircle, 
  ArrowRight, Menu, X, Heart, LogOut, CheckCircle, ChevronDown, ChevronUp 
} from 'lucide-react';
import { cmsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import LanguageSelector from '../components/LanguageSelector';
import ChatbotWidget from '../components/ChatbotWidget';

const DEFAULT_SUPPORT_DATA = {
  title: "How can we help you?",
  subtitle: "We're here to help and answer any question you might have.",
  search_placeholder: "Search for help articles...",
  assist_heading: "How can we assist you today?",
  cards: [
    {
      id: "help_center",
      title: "Browse Help Center",
      description: "Find answers to common questions and guides.",
      button_text: "Explore Articles",
      action_value: "#faq-section"
    },
    {
      id: "live_chat",
      title: "Live Chat",
      description: "Chat with our support team in real time.",
      button_text: "Start Chat",
      action_value: "#"
    },
    {
      id: "email_support",
      title: "Email Support",
      description: "Send us an email and we'll get back to you.",
      button_text: "Send Email",
      action_value: "support@x-space360.com"
    },
    {
      id: "call_support",
      title: "Call Support",
      description: "Speak directly with our support team.",
      button_text: "+91 8484826247",
      action_value: "+91 8484826247"
    }
  ],
  popular_topics: [
    { label: "How to add a new property?", link: "#faq-add-property" },
    { label: "What documents are required for KYC?", link: "#faq-kyc-docs" },
    { label: "Is Shop Act License mandatory?", link: "#faq-shop-act" },
    { label: "Subscription & Billing", link: "#faq-billing" },
    { label: "Account & Profile Settings", link: "#faq-profile" }
  ],
  support_hours: [
    { days: "Monday - Saturday", hours: "9:00 AM - 7:00 PM" },
    { days: "Sunday", hours: "10:00 AM - 4:00 PM" }
  ],
  response_time: "We usually respond within 24 hours.",
  footer_title: "Still need help?",
  footer_subtitle: "Our support team is ready to assist you.",
  footer_button_text: "Start Live Chat"
};

// Rich baseline FAQ dataset
const DEFAULT_FAQS = [
  {
    id: "faq-add-property",
    question: "How do I list a new property on X-Space360?",
    answer: "Log in to your host account, navigate to your Dashboard, and click the '+ List New Property' button. You will be guided through a step-by-step form to fill in the category, location, details, rates, and amenities. If you have not completed document verification, you will be prompted to submit required documents first."
  },
  {
    id: "faq-kyc-docs",
    question: "What documents are required for host verification?",
    answer: "For dynamic verification, you need to upload: (1) Aadhaar Card, (2) PAN Card, (3) Property Ownership Proof, (4) Electricity Bill (matching property address), and (5) Shop Act License (mandatory for operations). A GST Certificate is optional and can be uploaded if applicable."
  },
  {
    id: "faq-shop-act",
    question: "Is the Shop Act License mandatory for listing?",
    answer: "Yes. The Shop Act License is configured as a mandatory document (marked with a red asterisk '*') in our verification system. You must upload a valid copy to submit your account for host verification. GST certificates remain optional."
  },
  {
    id: "faq-billing",
    question: "How does Subscription & Billing work for hosts?",
    answer: "Hosts can choose from a range of BHK-specific subscription plans (Studio, 1 BHK, 2 BHK, etc.) with options for monthly or annual billing. The registration fee and plan selection can be managed directly under the subscription billing tab in your host account."
  },
  {
    id: "faq-profile",
    question: "How do I update my profile details or payout preferences?",
    answer: "Go to your Host Dashboard, click on Account/Settings, and update your personal information or bank details for payouts. All financial payouts are processed securely according to the payout cycles chosen in your preference tab."
  },
  {
    id: "faq-booking",
    question: "How do guests book stays and spaces?",
    answer: "Guests can browse our premium properties via the guest browse interface, filter by category or amenities, select check-in and check-out dates, add the number of guests, and submit a booking request. Payment can be processed securely online."
  }
];

const SUPPORT_SEO_FAQS = [
  {
    question: "How do I book a property on X-Space360?",
    answer:
      "Search for your preferred destination, select a property, check availability, review the pricing and policies, and complete the booking using the available payment options.",
  },
  {
    question: "How can I contact X-Space360 support?",
    answer:
      "You can contact X-Space360 through the support form, customer support email or phone number displayed on the Support page.",
  },
  {
    question: "How can I cancel a booking?",
    answer:
      "Open your booking details, select the cancellation option and review the applicable refund amount under the cancellation policy before confirming.",
  },
];

const SupportPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [lang, setLang] = useState('en');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [supportData, setSupportData] = useState(DEFAULT_SUPPORT_DATA);
  const [faqs, setFaqs] = useState(DEFAULT_FAQS);
  const [loading, setLoading] = useState(true);

  // FAQ section ref
  const faqSectionRef = useRef(null);
  // Active expanded FAQ accordion IDs
  const [expandedFaqId, setExpandedFaqId] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSupportPageContent();
  }, []);

  const fetchSupportPageContent = async () => {
    try {
      setLoading(true);
      const res = await cmsAPI.getSupportPage();
      if (res.data?.support_content) {
        const cmsFaqs = Array.isArray(res.data.support_content.faq_items)
          ? res.data.support_content.faq_items.filter(item => item?.question)
          : [];
        setSupportData({
          ...DEFAULT_SUPPORT_DATA,
          ...res.data.support_content
        });
        if (cmsFaqs.length > 0) {
          setFaqs(cmsFaqs.map((item, index) => ({
            id: item.id || `cms-support-faq-${index}`,
            question: item.question || '',
            answer: item.answer || ''
          })));
        }
      }
    } catch (err) {
      console.error('Failed to load support page dynamic content:', err);
    } finally {
      setLoading(false);
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

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitted(false);

    if (!formData.name || !formData.email || !formData.phone || !formData.subject || !formData.message) {
      setErrorMsg('Please fill in all the fields.');
      return;
    }

    try {
      setSubmitting(true);
      await cmsAPI.submitContactForm(formData);
      setSubmitted(true);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      console.error('Error submitting contact form:', err);
      setErrorMsg('Failed to submit your request. Please check your network and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToFaq = () => {
    faqSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCardClick = (card) => {
    if (card.id === 'live_chat') {
      // Trigger chatbot toggle
      const chatbotBtn = document.getElementById('chatbot-toggle-btn') || document.querySelector('.chatbot-trigger');
      if (chatbotBtn) {
        chatbotBtn.click();
      } else {
        alert("Live Chat is opening in Mayur AI Agent box on the bottom right.");
      }
      return;
    }

    if (card.id === 'email_support') {
      window.location.href = `mailto:${card.action_value}`;
      return;
    }

    if (card.id === 'call_support') {
      window.location.href = `tel:${card.action_value}`;
      return;
    }

    if (card.action_value === '#faq-section') {
      scrollToFaq();
      return;
    }

    if (card.action_value) {
      if (card.action_value.startsWith('http') || card.action_value.startsWith('/')) {
        navigate(card.action_value);
      }
    }
  };

  const handleTopicClick = (link, e) => {
    e.preventDefault();
    if (link.startsWith('#')) {
      const faqId = link.replace('#', '');
      const item = faqs.find(f => f.id === faqId || f.id.includes(faqId));
      if (item) {
        setExpandedFaqId(item.id);
        scrollToFaq();
      } else {
        scrollToFaq();
      }
    }
  };

  // Filter FAQs based on search query
  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const schemaFaqs = faqs.length ? faqs : SUPPORT_SEO_FAQS;
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": "https://x-space360.in/support#faq",
    mainEntity: schemaFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  // Auto-expand single result
  useEffect(() => {
    if (searchQuery.trim() !== '' && filteredFaqs.length > 0) {
      setExpandedFaqId(filteredFaqs[0].id);
    }
  }, [searchQuery]);

  // Get matching channel icon
  const getCardIcon = (id) => {
    switch (id) {
      case 'help_center':
        return <FileText className="w-6 h-6 text-terracotta" />;
      case 'live_chat':
        return <MessageSquare className="w-6 h-6 text-terracotta" />;
      case 'email_support':
        return <Mail className="w-6 h-6 text-terracotta" />;
      case 'call_support':
        return <Phone className="w-6 h-6 text-terracotta" />;
      default:
        return <HelpCircle className="w-6 h-6 text-terracotta" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] font-sans text-charcoal overflow-x-hidden selection:bg-terracotta/20">
      <SEO
        title="Help and Support Center"
        description="Get help with X-Space360 bookings, cancellations, refunds, payments, host accounts and property listings."
        path="/support"
        keywords={[
          "X-Space360 support",
          "booking help",
          "refund support",
          "host support",
        ]}
        schema={faqSchema}
      />
      
      {/* Navbar - Solid background for support page */}
      <nav className="sticky top-0 z-50 flex justify-between items-center text-charcoal bg-white/95 backdrop-blur-md px-6 md:px-12 lg:px-20 h-20 border-b border-sand-200 shadow-sm">
        {/* Left Logo */}
        <div className="flex items-center">
          <img src="/logo.png" alt="X-Space360 Logo" className="h-8 md:h-10 w-auto object-contain cursor-pointer" onClick={() => navigate('/')} />
        </div>

        {/* Center Pill Links */}
        <div className="hidden lg:flex h-12 items-center px-8 space-x-6 font-semibold text-[11px] uppercase tracking-widest text-charcoal-muted bg-sand-50 border border-sand-200 rounded-none shadow-sm self-center">
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); navigate('/guest/browse'); }}
            className="hover:text-terracotta transition"
          >
            Discover
          </a>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); navigate('/guest/browse?wishlist=true'); }}
            className="hover:text-terracotta transition flex items-center space-x-1"
          >
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            <span>Wishlist</span>
          </a>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); navigate('/'); }}
            className="hover:text-terracotta transition"
          >
            Home
          </a>
          <div className="w-[1px] h-4 bg-sand-200" />
          <LanguageSelector
            currentLang={lang}
            onLanguageChange={(l) => setLang(l)}
          />
          <div className="w-[1px] h-4 bg-sand-200" />
          {user ? (
            <>
              <button
                onClick={() => navigate('/dashboard')}
                className="hover:text-terracotta transition font-black text-terracotta"
              >
                Dashboard
              </button>
              <button
                onClick={handleSignOut}
                className="bg-terracotta hover:bg-terracotta-dark text-white px-4 py-1.5 rounded-none transition shadow-sm text-[10px]"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="hover:text-terracotta transition"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="bg-terracotta hover:bg-terracotta-dark text-white px-4 py-1.5 rounded-none transition shadow-sm text-[10px]"
              >
                Get Started
              </button>
            </>
          )}
        </div>

        {/* Right — Get the app (Desktop) */}
        <div className="hidden lg:flex items-center">
          <button onClick={() => navigate('/login')} className="flex items-center space-x-2 border border-sand-300 rounded-none px-5 py-2 hover:bg-sand-50 transition shadow-sm text-charcoal">
            <span className="text-[10px] font-bold uppercase tracking-widest">Get the app</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Hamburger Icon */}
        <div className="lg:hidden flex items-center">
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-charcoal hover:text-terracotta transition p-2">
            <Menu className="w-8 h-8" />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-charcoal/95 backdrop-blur-xl flex flex-col pt-6 pb-10 px-6 overflow-y-auto text-white lg:hidden animate-fadeIn">
          <div className="flex justify-between items-center mb-12">
            <img src="/logo.png" alt="X-Space360 Logo" className="h-8 w-auto object-contain cursor-pointer brightness-0 invert" onClick={() => { setIsMobileMenuOpen(false); navigate('/'); }} />
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-white hover:text-terracotta transition p-2 bg-white/10 rounded-none">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex flex-col space-y-6 text-lg font-bold tracking-wide">
            <a href="#" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); navigate('/guest/browse'); }} className="hover:text-terracotta transition py-2 border-b border-white/5">Discover</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); navigate('/guest/browse?wishlist=true'); }} className="hover:text-terracotta transition py-2 border-b border-white/5">Wishlist</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); navigate('/'); }} className="hover:text-terracotta transition py-2 border-b border-white/5">Home</a>
            {user ? (
              <>
                <a href="#" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); navigate('/dashboard'); }} className="text-terracotta py-2 border-b border-white/5">Dashboard</a>
                <button onClick={() => { setIsMobileMenuOpen(false); handleSignOut(); }} className="btn-premium py-3 text-center rounded-none font-bold uppercase tracking-wider bg-terracotta text-white mt-4">Sign Out</button>
              </>
            ) : (
              <>
                <a href="#" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); navigate('/login'); }} className="hover:text-terracotta transition py-2 border-b border-white/5">Sign In</a>
                <button onClick={() => { setIsMobileMenuOpen(false); navigate('/register'); }} className="btn-premium py-3 text-center rounded-none font-bold uppercase tracking-wider bg-terracotta text-white mt-4">Get Started</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#0b1b2e] via-[#07111e] to-[#101722] text-white py-20 px-6 md:px-12 lg:px-20 overflow-hidden">
        {/* Subtle mesh background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
        <div className="absolute top-1/3 left-1/4 w-[30rem] h-[30rem] bg-terracotta/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[30rem] h-[30rem] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-8 z-10">
          <div className="space-y-4">
            <span className="inline-block px-4 py-1.5 bg-terracotta/15 text-terracotta border border-terracotta/30 text-[10px] font-black uppercase tracking-widest rounded-full">
              Support Center
            </span>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight text-white">
              {supportData.title.split(' ').map((word, idx, arr) => {
                if (word.toLowerCase().includes('help')) {
                  return <span key={idx} className="text-terracotta italic font-serif">help </span>;
                }
                return word + ' ';
              })}
            </h2>
            <p className="text-sm md:text-base text-white/70 font-medium max-w-xl mx-auto leading-relaxed">
              {supportData.subtitle}
            </p>
          </div>

          {/* Search Form - Robust flex row prevents button clipping */}
          <div className="max-w-2xl mx-auto">
            <div className="flex bg-white shadow-premium rounded-2xl border border-sand-200 overflow-hidden p-1">
              <div className="flex items-center pl-4 text-gray-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder={supportData.search_placeholder}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-4 py-3.5 text-charcoal placeholder-gray-400 outline-none font-semibold text-sm rounded-l-2xl border-none focus:ring-0"
              />
              <button
                type="button"
                onClick={scrollToFaq}
                className="bg-terracotta hover:bg-terracotta-hover text-white px-8 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center shrink-0"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Grid: 4 Support Channel Cards */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 -mt-10 relative z-20">
        <h3 className="text-xs font-black text-charcoal-muted uppercase tracking-widest text-center mb-6 hidden md:block">
          {supportData.assist_heading}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(supportData.cards || []).map((card) => (
            <div 
              key={card.id} 
              className="bg-white p-6 shadow-premium border border-sand-200/60 hover:border-terracotta/40 rounded-2xl transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 bg-sand-50 flex items-center justify-center rounded-xl group-hover:bg-terracotta/10 transition-colors duration-300">
                  {getCardIcon(card.id)}
                </div>
                <div>
                  <h4 className="text-base font-bold text-charcoal group-hover:text-terracotta transition-colors">{card.title}</h4>
                  <p className="text-xs text-charcoal-muted mt-2 leading-relaxed font-semibold">
                    {card.description}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => handleCardClick(card)}
                className="mt-6 w-full py-2.5 border border-sand-200 group-hover:border-terracotta group-hover:bg-terracotta group-hover:text-white text-charcoal text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 flex items-center justify-center space-x-1.5 font-bold"
              >
                <span>{card.button_text}</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Main Body: Form + Sidebar (Hours & Topics) */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          
          {/* Left: Message Submission Form */}
          <div className="lg:col-span-2 bg-white border border-sand-200/60 shadow-premium p-8 rounded-2xl space-y-6">
            <div>
              <h3 className="text-2xl font-black text-charcoal font-display">Send Us a Message</h3>
              <p className="text-xs text-charcoal-muted font-semibold mt-1">
                Fill in the details below and we'll get back to you as soon as possible.
              </p>
            </div>

            {submitted ? (
              <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-2xl space-y-4 text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 flex items-center justify-center rounded-full mx-auto">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-emerald-800 font-display">Message Submitted!</h4>
                <p className="text-xs text-emerald-700 font-semibold max-w-md mx-auto leading-relaxed">
                  Thank you for reaching out. We have successfully received your inquiry and our support team will get in touch with you shortly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-6 py-2 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-black uppercase tracking-wider rounded-xl transition"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-6 font-semibold">
                {errorMsg && (
                  <div className="p-4 bg-red-50 border border-red-150 text-red-600 text-xs rounded-xl font-bold">
                    {errorMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border border-sand-200 focus:border-terracotta rounded-xl px-4 py-3 outline-none transition text-sm bg-sand-50/20 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="Enter your email address"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border border-sand-200 focus:border-terracotta rounded-xl px-4 py-3 outline-none transition text-sm bg-sand-50/20 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Phone Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="Enter your phone number"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full border border-sand-200 focus:border-terracotta rounded-xl px-4 py-3 outline-none transition text-sm bg-sand-50/20 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Subject</label>
                    <select
                      required
                      value={formData.subject}
                      onChange={e => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full border border-sand-200 focus:border-terracotta rounded-xl px-4 py-3 outline-none transition text-sm bg-sand-50/20 focus:bg-white text-charcoal"
                    >
                      <option value="">Select a subject</option>
                      <option value="Booking Inquiry">Booking Inquiry</option>
                      <option value="Listing a Property">Listing a Property / Host Verification</option>
                      <option value="Subscription & Payments">Subscription & Payments</option>
                      <option value="Account Issue">Account or Sign In Issue</option>
                      <option value="Grievance">Grievance & Escalations</option>
                      <option value="Other">Other / General Question</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Message Description</label>
                  <textarea
                    rows={5}
                    required
                    placeholder="Type your message details here..."
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                    className="w-full border border-sand-200 focus:border-terracotta rounded-xl px-4 py-3 outline-none transition text-sm bg-sand-50/20 focus:bg-white leading-relaxed"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
                  <span className="text-[10px] text-charcoal-muted font-bold block flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-terracotta" />
                    <span>Your information is secure and protected under privacy policies.</span>
                  </span>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-premium px-8 py-3.5 flex items-center justify-center space-x-2 text-xs font-black uppercase tracking-wider bg-terracotta hover:bg-terracotta-hover text-white rounded-xl shadow-premium active:scale-95 transition-all self-end sm:self-auto"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right: Sidebar Information (Hours & Topics) */}
          <div className="space-y-8">
            
            {/* Popular Topics */}
            <div className="bg-white border border-sand-200/60 p-6 rounded-2xl space-y-4 shadow-premium">
              <h4 className="text-sm font-black text-charcoal uppercase tracking-widest border-b border-sand-100 pb-3 font-serif">
                Popular Topics
              </h4>
              <ul className="space-y-3">
                {(supportData.popular_topics || []).map((topic, index) => (
                  <li key={index}>
                    <a 
                      href={topic.link || "#"}
                      onClick={(e) => handleTopicClick(topic.link, e)}
                      className="flex items-center justify-between text-xs font-bold text-charcoal-muted hover:text-terracotta transition-colors group py-1"
                    >
                      <span>{topic.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-terracotta transform group-hover:translate-x-1 transition-all" />
                    </a>
                  </li>
                ))}
              </ul>
              <button 
                onClick={scrollToFaq}
                className="w-full mt-4 py-2.5 border border-sand-200 hover:border-terracotta hover:bg-sand-50 text-[10px] font-black uppercase tracking-widest text-charcoal rounded-xl transition shadow-premium"
              >
                View All FAQ Articles
              </button>
            </div>

            {/* Support Hours */}
            <div className="bg-white border border-sand-200/60 p-6 rounded-2xl space-y-4 shadow-premium font-semibold">
              <h4 className="text-sm font-black text-charcoal uppercase tracking-widest border-b border-sand-100 pb-3 font-serif">
                Support Hours
              </h4>
              <div className="space-y-4">
                {(supportData.support_hours || []).map((hour, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-charcoal-muted">{hour.days}</span>
                    <span className="text-charcoal font-bold">{hour.hours}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-sand-100 text-[10px] font-bold text-terracotta flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-terracotta animate-pulse" />
                <span>{supportData.response_time}</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Accordion FAQ Section */}
      <section ref={faqSectionRef} id="faq-section" className="bg-[#FAF8F5] border-t border-sand-200/60 py-20 px-6 md:px-12 lg:px-20">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="inline-block px-3 py-1 bg-terracotta/10 text-terracotta text-[10px] font-black uppercase tracking-widest rounded-none">
              FAQ Help Desk
            </span>
            <h3 className="text-3xl font-black text-charcoal tracking-tight font-serif">
              Frequently Asked Questions
            </h3>
            <p className="text-xs text-charcoal-muted font-bold max-w-lg mx-auto">
              Find instant solutions regarding account creation, host document verification rules, and billing details.
            </p>
          </div>

          {searchQuery && (
            <div className="text-xs text-charcoal-muted font-bold">
              Showing {filteredFaqs.length} results for "{searchQuery}"
            </div>
          )}

          <div className="space-y-4">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq) => {
                const isOpen = expandedFaqId === faq.id;
                return (
                  <div 
                    key={faq.id}
                    className="bg-white border border-sand-200/60 rounded-2xl shadow-subtle overflow-hidden hover:border-terracotta/30 transition-all duration-300"
                  >
                    <button
                      onClick={() => setExpandedFaqId(isOpen ? null : faq.id)}
                      className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-charcoal hover:text-terracotta transition-colors duration-200 text-sm md:text-base font-display"
                    >
                      <span>{faq.question}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-terracotta shrink-0 ml-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-charcoal-light shrink-0 ml-4" />
                      )}
                    </button>
                    
                    {isOpen && (
                      <div className="px-6 pb-6 pt-1 text-xs md:text-sm text-charcoal-muted leading-relaxed font-semibold border-t border-sand-100/60 animate-fadeIn">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 bg-white border border-dashed border-sand-300 text-charcoal-muted text-sm font-semibold">
                No matching FAQs found. Please send us a message above!
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bottom Footer Banner */}
      <section className="bg-sand-100 border-y border-sand-200 py-16 px-6 text-center space-y-6">
        <div className="max-w-xl mx-auto space-y-2">
          <h3 className="text-2xl font-black text-charcoal font-display">
            {supportData.footer_title}
          </h3>
          <p className="text-xs text-charcoal-muted font-bold leading-relaxed">
            {supportData.footer_subtitle}
          </p>
        </div>
        <button
          onClick={() => {
            const chatbotBtn = document.getElementById('chatbot-toggle-btn') || document.querySelector('.chatbot-trigger');
            if (chatbotBtn) chatbotBtn.click();
          }}
          className="btn-premium px-8 py-3.5 bg-charcoal hover:bg-charcoal-light text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-premium inline-flex items-center space-x-2 transition-all active:scale-95 font-bold"
        >
          <MessageSquare className="w-4 h-4 text-terracotta" />
          <span>{supportData.footer_button_text}</span>
        </button>
      </section>

      {/* Footer Branding */}
      <footer className="relative overflow-hidden border-t border-white/10 bg-[#081321] text-white py-16 px-6 md:px-12 lg:px-20 font-medium text-xs">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0b1b2e_0%,#07111e_48%,#101722_100%)] pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="X-Space360 Logo" className="h-6 w-auto object-contain logo-white" />
            <span className="text-white/30 font-bold">|</span>
            <span className="text-white/60 font-medium">© {new Date().getFullYear()} Goldenrich Group. All rights reserved.</span>
          </div>
          <div className="flex space-x-6 text-white/80">
            <a href="/terms" className="hover:text-terracotta transition duration-300">Terms of Service</a>
            <a href="/privacy" className="hover:text-terracotta transition duration-300">Privacy Policy</a>
            <span onClick={scrollToFaq} className="hover:text-terracotta transition cursor-pointer duration-300 font-bold">FAQs</span>
          </div>
        </div>
      </footer>
      <ChatbotWidget />
    </div>
  );
};

export default SupportPage;
