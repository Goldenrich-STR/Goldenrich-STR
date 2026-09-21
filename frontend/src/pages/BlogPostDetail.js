import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { 
  Building2, MapPin, Mail, Phone, ShieldCheck, CheckCircle2, Sparkles, 
  Facebook, Instagram, Youtube, Menu, X, ArrowLeft, Clock, User, Share2, 
  HelpCircle, ChevronDown, ChevronUp, Calendar, Tag, BookOpen, Check,
  Twitter, Mail as MailIcon, Flower2, Home
} from 'lucide-react';
import apiClient, { getImageUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import LanguageSelector from '../components/LanguageSelector';
import Footer from '../components/Footer';
import { formatContentWithBullets, markdownComponents } from '../lib/formatContent';

const SITE_URL = "https://x-space360.in";

const DEFAULT_BLOG_KEYWORDS = [
  "short term rental",
  "vacation rental guide",
  "STR investment India",
  "villa hosting tips",
  "X-Space360 journal"
];

const FALLBACK_BLOG_POSTS = [
  {
    id: 'p1',
    slug: 'what-is-short-term-rental',
    metaTitle: 'What Is a Short-Term Rental: A Simple Guide',
    metaDescription: 'Learn what a short-term rental is, how it works, who can use it, and what to check before booking a short-term rental in Nashik.',
    title: 'What Is a Short-Term Rental? A Simple Guide for Renters',
    excerpt: 'Need a place to stay for a few days without booking a hotel? A short-term rental could be the best choice. Learn how short-term rentals work in Nashik.',
    content: `Need a place to stay for a few days without booking a hotel? A short-term rental could be the best choice. 

A short-term rental is a fully furnished home or residential property rented to guests for a temporary stay, usually for less than 30 days.

For example, if you are visiting Nashik for a wedding, a weekend trip, business work, or a family visit, you may not need a home for months. You may simply need a comfortable place for a few days.

In this blog, you will learn how short-term rentals work, what types of properties you can rent, who they are suitable for, and what to check before booking one.

---

## What Is a Short-Term Rental?

A short-term rental (STR) is a furnished residential property rented to guests for a limited period, often for a few days or weeks. Unlike a long-term rental, you do not need to commit to living there for several months or a year.

For example, imagine you are coming to Nashik for five days for a wedding. Renting a house for a year would not make sense. A short-term rental lets you book a suitable place only for the time you need.

Short-term rentals can come in different forms, including **apartments**, **studios**, **villas**, **bungalows**, **private houses**, and **farmhouses**. The right choice depends on your group size, location, budget, and the facilities you need.

The rental period and rules can vary from one property to another. So, always check the booking terms before confirming your stay.

---

## How Does a Short-Term Rental Work?

Booking a short-term rental is usually simple. You choose a property based on where you want to stay, how long you need it, and what facilities you want.

Here is how the process usually works:
- **Choose your dates and location**: Decide where you want to stay and the dates of your visit.
- **Find a suitable property**: Look at apartments, villas, houses, or other available options.
- **Compare the details**: Check the price, size, facilities, location, and number of guests allowed.
- **Read the rules**: Check check-in and check-out times, cancellation rules, and any property-specific conditions.
- **Make your booking**: Once you are happy with the property and terms, confirm your stay.
- **Stay and check out**: Stay for the agreed period and follow the property's check-out instructions.

Before booking, always check the total cost and property details so there are no surprises later.

---

## What Types of Properties Can Be Rented Short-Term?

Short-term rentals are not limited to one type of property. You can choose a place based on the number of people staying, your budget, and the kind of space you need.

- **Studio**: A compact option that can work well for one or two people.
- **Apartment**: A good choice for couples, families, or small groups who want separate living space.
- **Villa**: Offers more space and privacy, making it suitable for families or larger groups.
- **Bungalow**: A standalone property that can be a comfortable choice for families or groups.
- **Private House**: Gives guests a home-like space and can work well for longer short stays.
- **Farmhouse**: A larger property that may suit groups looking for more outdoor and private space.

The best property depends on your stay, group size, budget, location, and required facilities. For example, a couple may be comfortable in a studio, while a family or group may need a villa or farmhouse.

---

## Short-Term Rental vs. Long-Term Rental: What’s the Difference?

The biggest difference is how long you rent the property. A short-term rental is meant for a temporary stay, while a long-term rental is usually taken for several months or longer.

| Feature | Short-Term Rental | Long-Term Rental |
| :--- | :--- | :--- |
| **Rental period** | Usually days or weeks | Usually several months or longer |
| **Flexibility** | More flexible for temporary stays | Less flexible once the lease is signed |
| **Furniture** | Usually furnished | May be furnished or unfurnished |
| **Best for** | Trips, events, work visits, temporary stays | Regular or permanent living |
| **Commitment** | Shorter commitment | Longer commitment |

For example, if you are staying in Nashik for one week for a wedding, a short-term rental may suit your needs. If you are moving to Nashik for a year, a long-term rental may be a better choice.

---

## Who Can Use a Short-Term Rental?

A short-term rental can be useful for anyone who needs a place to stay for a limited period. You do not have to be on vacation to use one.

Here are some common situations where it can be a good option:
- **Tourists**: A comfortable place to stay during a trip.
- **Families**: Useful when visiting relatives or spending a few days in another city.
- **Business travelers**: A practical option for short work trips or meetings.
- **Wedding guests**: Helpful when attending a wedding or family function.
- **People visiting Nashik**: Suitable for short visits without taking a long-term lease.
- **Groups**: Villas, bungalows, or farmhouses can provide enough space for several people.
- **People needing temporary accommodation**: Useful when you need a place for a short period while moving, working, or handling other personal needs.

The main benefit is simple: you rent the property for the time you actually need it, instead of committing to a long-term rental.

---

## What Should You Check Before Booking a Short-Term Rental?

Finding a property is only the first step. Before you book, take a few minutes to check the details. This can help you avoid extra costs or problems during your stay.

Here are some important things to check:
- **Location**: Make sure the property is close to the places you need to visit.
- **Total price**: Check the full cost, including any additional charges.
- **Property photos**: Make sure the photos match the property description.
- **Amenities**: Check if the property has the facilities you need, such as Wi-Fi, parking, a kitchen, or air conditioning.
- **Guest capacity**: Confirm that the property can comfortably accommodate everyone in your group.
- **Reviews**: Read recent guest reviews to understand what previous guests experienced.
- **Check-in and check-out**: Know when you can arrive and when you need to leave.
- **Cancellation policy**: Check what happens if your plans change.
- **House rules**: Look for rules about guests, noise, pets, smoking, or other restrictions.

---

## Short-Term Rentals in Nashik

Nashik attracts visitors for different reasons, from weekend trips and family functions to weddings, business visits, and local tourism. Depending on your plans, you may need a place for only a few days rather than a long-term home.

A short-term rental gives you different property choices based on your needs. You may prefer an apartment for a small family, a villa for a group, or a farmhouse for a larger gathering.

If you are looking for a short-term rental in Nashik, X-Space360 lets you find different property options for temporary stays. You can compare properties based on factors such as location, space, and the facilities you need before choosing a place that suits your stay.`,
    date: 'September 19, 2026',
    author: 'STR Insights Desk',
    read_time: '5 min read',
    image_url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=1200',
    faqs: [
      { question: 'What is another name for a short-term rental?', answer: 'A short-term rental can also be called a vacation rental, holiday rental, temporary rental, or short-term accommodation.' },
      { question: 'What is a long-term rental?', answer: 'A long-term rental is a property rented for a longer period, usually several months or more, often under a lease agreement.' },
      { question: 'Is 3 months a short-term rental?', answer: 'It can be. A three-month stay may be considered a short-term or medium-term rental, depending on the property, rental terms, and local rules.' },
      { question: 'What is the shortest time you can rent a property?', answer: 'There is no single minimum period for every property. Some short-term rentals can be booked for one night, while others may require a minimum stay of a few days or more.' },
      { question: 'What are the best platforms for short-term rentals?', answer: 'The best platform depends on your location and needs. Look for platforms that offer clear property details, reviews, pricing, availability, and secure booking features like X-Space360.' }
    ]
  },
  {
    id: 'p2',
    slug: 'the-future-of-short-term-rentals-in-india',
    title: 'The Future of Short-Term Rentals in India',
    excerpt: 'How shifting preferences and hybrid work models are driving growth in STR spaces.',
    content: `## The Future of Short-Term Rentals in India

The real estate landscape is undergoing a massive paradigm shift. Traditional long-term leasing is rapidly giving way to dynamic short-term rentals (STRs). Fueled by hybrid work policies, weekend staycations, and digital nomad lifestyle choices, short-term rentals are yielding up to 3x higher monthly returns for property owners across Indian metro and getaway destinations.`,
    date: 'June 10, 2026',
    author: 'Amit Sharma',
    read_time: '6 min read',
    image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1200',
    faqs: [
      { question: 'What is considered a short-term rental in India?', answer: 'Any residential property (villa, homestay, or apartment) rented out for periods under 30 days is classified as a short-term rental.' },
      { question: 'How much higher are STR yields compared to standard 11-month leases?', answer: 'Hosts on X-Space360 typically generate 1.8x to 3x higher net income compared to traditional long-term tenants by leveraging dynamic weekend pricing.' }
    ]
  },
  {
    id: 'p3',
    slug: 'top-5-weekend-escapes-near-mumbai-and-nashik',
    title: 'Top 5 Weekend Escapes Near Mumbai & Nashik',
    excerpt: 'Explore the most beautiful villa retreats and holiday home collections for your next vacation.',
    content: `## Top 5 Weekend Escapes Near Mumbai & Nashik

From scenic vineyard villas in Nashik to lush hilltop homestays in Igatpuri and Trimbakeshwar, short weekend getaways have become an integral part of urban living.`,
    date: 'May 28, 2026',
    author: 'Vikram Singh',
    read_time: '7 min read',
    image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200',
    faqs: [
      { question: 'When is the best time to visit Nashik and Igatpuri?', answer: 'Monsoons (July to October) offer lush greenery and waterfalls, while winters (November to February) are ideal for vineyard tours and outdoor dining.' },
      { question: 'Are these villas suitable for family celebrations and group stays?', answer: 'Yes! Most featured weekend villas offer private swimming pools, sprawling lawns, and full kitchen setups perfect for family gatherings.' }
    ]
  }
];

const slugify = (value) => String(value || '')
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const BlogPostDetail = () => {
  const navigate = useNavigate();
  const { slug: postSlug } = useParams();
  const { user, logout } = useAuth();
  const [lang, setLang] = useState(localStorage.getItem('preferredLanguage') || 'en');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cmsContent, setCmsContent] = useState(null);
  const [copied, setCopied] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

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

  const blogPosts = useMemo(() => {
    if (cmsContent?.blog && Array.isArray(cmsContent.blog.posts)) {
      const visibleCmsBlogPosts = cmsContent.blog.posts.filter(post => post?.is_active !== false);
      return visibleCmsBlogPosts.map((post, idx) => {
        const postImg = post.image_url || post.img || post.featuredImage || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=1200';
        
        // Auto-generate FAQs from blog title/content if no explicit FAQs are saved
        let autoFaqs = Array.isArray(post.faqs) && post.faqs.length ? post.faqs : [];
        if (autoFaqs.length === 0) {
          const title = post.title || 'Short-Term Rental';
          autoFaqs = [
            {
              question: `What should you know about ${title.toLowerCase().replace(/\?$/, '')}?`,
              answer: post.excerpt || `This article details key considerations regarding ${title}, helping guests and hosts make informed booking decisions.`
            },
            {
              question: `Why is this topic important for short-term rental guests and hosts?`,
              answer: `Understanding these insights ensures smooth stay experiences, transparent pricing, and better property management standards on X-Space360.`
            },
            {
              question: `How can I learn more or book related properties?`,
              answer: `Explore available stays directly on X-Space360 or check our support center for host and guest guidelines.`
            }
          ];
        }

        return {
          id: post.id || `cms-post-${idx}`,
          title: post.title || 'Untitled Article',
          excerpt: post.excerpt || '',
          content: post.content || '',
          date: post.date || 'September 2026',
          author: post.author || 'X-Space360 Desk',
          read_time: post.read_time || '5 min read',
          image_url: postImg,
          slug: post.slug || slugify(post.title || `post-${idx}`),
          faqs: autoFaqs,
          tableData: post.tableData,
          metaTitle: post.metaTitle,
          metaDescription: post.metaDescription
        };
      });
    }
    return FALLBACK_BLOG_POSTS;
  }, [cmsContent]);

  const currentPost = useMemo(() => {
    if (!blogPosts.length) return null;
    if (!postSlug) return blogPosts[0];
    const match = blogPosts.find(p => p.slug === postSlug || slugify(p.title) === postSlug || String(p.id) === postSlug);
    return match || blogPosts[0];
  }, [postSlug, blogPosts]);

  const otherPosts = useMemo(() => {
    return blogPosts.filter(p => p.id !== currentPost?.id).slice(0, 3);
  }, [blogPosts, currentPost]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const toggleFaq = (idx) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (!currentPost) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FBFBFA] font-sans text-charcoal flex flex-col justify-between">
      <SEO
        title={currentPost.title}
        description={currentPost.excerpt || "Read full article on X-Space360 Journal."}
        path={`/blog/${currentPost.slug}`}
        image={currentPost.image_url}
        type="article"
      />

      {/* Modern Fixed Navbar */}
      <nav className="fixed top-0 left-0 right-0 w-full z-50 flex justify-between items-center text-charcoal px-6 md:px-12 lg:px-20 h-20 bg-white/90 backdrop-blur-md border-b border-stone shadow-sm">
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
          <Link to="/blog" className="text-terracotta font-bold transition">
            Journal
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

      {/* Main Article Container */}
      <main className="pt-24 pb-20 flex-1">
        
        {/* Navigation / Breadcrumb Header */}
        <div className="max-w-4xl mx-auto px-6 pt-6 pb-4">
          <button
            onClick={() => navigate('/blog')}
            className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-teal-700 hover:text-teal-900 transition group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>BACK TO RENTER GUIDES</span>
          </button>
        </div>

        {/* Hero Section of Article */}
        <article className="max-w-4xl mx-auto px-4 md:px-6 space-y-10">
          
          {/* Badge & Title Header */}
          <div className="text-center space-y-6 pt-2">
            
            {/* Custom Logo/Badge Mimicking Trulia */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="flex items-end justify-center">
                <Flower2 className="w-8 h-8 text-orange-500 -mr-2 mb-1" />
                <Home className="w-10 h-10 text-emerald-900" />
              </div>
              <span className="text-2xl font-black text-[#6B1934] tracking-tight font-serif">Renter Guides</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-[56px] font-black text-[#0F4A33] leading-[1.1] tracking-tight font-sans mx-auto max-w-3xl">
              {currentPost.title}
            </h1>
          </div>

          {/* Hero Banner Box with Soft Beige Background */}
          <div className="w-full bg-[#F0E5DE] rounded-xl md:rounded-3xl p-6 md:p-12 text-center flex flex-col items-center justify-center min-h-[300px] md:min-h-[450px]">
            {currentPost.image_url ? (
              <img
                src={getImageUrl(currentPost.image_url)}
                alt={currentPost.title}
                className="max-h-[350px] w-auto object-contain drop-shadow-xl"
              />
            ) : (
              <div className="w-48 h-48 rounded-full bg-emerald-800 flex items-center justify-center text-white">
                <Building2 className="w-24 h-24" />
              </div>
            )}
          </div>

          {/* Subtitle Headline */}
          <div className="text-center max-w-3xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-light text-gray-500 tracking-tight leading-relaxed">
              {currentPost.excerpt || "Need flexibility? Short term rentals might be the answer."}
            </h2>
          </div>

          {/* Date & Author Bar */}
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-6 border-t-2 border-b border-gray-200">
              <div className="text-sm md:text-base text-gray-500">
                <strong className="text-gray-900 font-bold">Updated:</strong> {currentPost.date} <span className="mx-2">|</span> {currentPost.author}
              </div>
            </div>
          </div>

          {/* Key Takeaways Box (Matching 2nd Image) */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-6 md:p-8 space-y-4 shadow-sm">
            <h3 className="text-xl font-extrabold text-gray-900 font-sans tracking-tight">
              Key takeaways:
            </h3>
            <ul className="space-y-3 text-sm md:text-base text-gray-800 leading-relaxed font-normal list-disc ml-5">
              <li>Short-term rentals generally refer to rentals with leases that are less than 12 months (usually days or weeks).</li>
              <li>Includes vacation rentals, furnished apartments, corporate housing, and month-to-month leases.</li>
              <li>Furnished units and corporate housing typically run one to six months and often include utilities.</li>
              <li>Month-to-month leases allow flexibility to leave after a month's notice.</li>
              <li>Check check-in/out times, cancellation policies, guest capacity, and house rules before booking.</li>
            </ul>
          </div>

          {/* Main Body Markdown Content */}
          <div className="prose prose-lg max-w-none text-gray-800 font-normal leading-relaxed space-y-6 pt-4">
            {currentPost.content ? (
              <ReactMarkdown components={markdownComponents}>
                {formatContentWithBullets(currentPost.content)}
              </ReactMarkdown>
            ) : (
              <p className="text-gray-500 italic">No full article body provided yet.</p>
            )}
          </div>

          {/* Dedicated Table Section */}
          {currentPost.tableData && currentPost.tableData.headers && currentPost.tableData.rows && (
            <div className="mt-8 mb-4 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm md:text-base border-collapse">
                  {currentPost.tableData.title && (
                    <caption className="caption-top text-xl font-bold text-gray-900 mb-4 text-left p-1">
                      {currentPost.tableData.title}
                    </caption>
                  )}
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {currentPost.tableData.headers.map((header, idx) => (
                        <th key={idx} className="p-3 md:p-4 font-bold text-gray-900 border-r border-gray-200 last:border-r-0">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentPost.tableData.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50/50 transition-colors">
                        {row.map((cell, colIndex) => (
                          <td key={colIndex} className="p-3 md:p-4 text-gray-700 border-r border-gray-200 last:border-r-0">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Clean Skyscanner/Trulia Style FAQ Accordion Section */}
          {Array.isArray(currentPost.faqs) && currentPost.faqs.length > 0 && (
            <div className="mt-16 pt-10 border-t border-gray-200 space-y-6">
              <h3 className="text-3xl font-bold text-gray-900 tracking-tight font-sans">
                Frequently Asked Questions
              </h3>

              <div className="divide-y divide-gray-200 border-y border-gray-200">
                {currentPost.faqs.map((faq, idx) => (
                  <div key={idx} className="py-4 transition-colors">
                    <button
                      onClick={() => toggleFaq(idx)}
                      className="w-full flex items-center justify-between text-left font-bold text-gray-900 text-base md:text-lg hover:text-emerald-700 transition py-1 group"
                    >
                      <span className="pr-4">{faq.question}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${
                          openFaqIndex === idx ? 'rotate-180 text-emerald-700' : ''
                        }`}
                      />
                    </button>
                    {openFaqIndex === idx && (
                      <div className="pt-3 pb-2 text-sm md:text-base text-gray-700 font-normal leading-relaxed animate-fadeIn">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Articles Cards */}
          {otherPosts.length > 0 && (
            <div className="mt-16 pt-12 border-t border-gray-200 space-y-8">
              <h3 className="text-2xl font-bold text-gray-900 font-serif">Read More Guides</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {otherPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => navigate(`/blog/${post.slug}`)}
                    className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col group"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                      <img
                        src={getImageUrl(post.image_url)}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                      <h4 className="text-sm font-bold text-gray-900 leading-snug group-hover:text-emerald-700 transition line-clamp-2">
                        {post.title}
                      </h4>
                      <p className="text-xs text-gray-600 line-clamp-2 font-medium">
                        {post.excerpt}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>

      {/* Footer */}
      <Footer cmsContent={cmsContent} />
    </div>
  );
};

export default BlogPostDetail;
