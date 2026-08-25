import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Crown, Building2, MapPin, Calendar, Star, Zap, Search, User, LogOut, CheckCircle2, ShieldCheck, ClipboardList, Sparkles, X, CreditCard, ArrowRight, Home, Briefcase, PartyPopper, Facebook, Instagram, Youtube, Heart, Share2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Menu, Compass, Trees, Waves, Hotel, Sunset, UserCheck, ChefHat, ConciergeBell, Gamepad2, Mail, Phone } from 'lucide-react';
import apiClient, { propertyAPI, getImageUrl, PROPERTY_IMAGE_PLACEHOLDER } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import ShareDropdown from '../components/ShareDropdown';
import ChatbotWidget from '../components/ChatbotWidget';
import LanguageSelector from '../components/LanguageSelector';
import { formatCategoryLabel, formatPropertyTypeLabel } from '../lib/displayLabels';
import { getRecentlyVisitedProperties, RECENTLY_VISITED_PROPERTIES_EVENT } from '../lib/recentlyVisitedProperties';
import { organizationSchema, websiteSchema } from '../lib/seoSchemas';
import LegalDocument from '../components/LegalDocument';
import ScrollReveal from '../components/ui/ScrollReveal';
import DateRangePicker from '../components/ui/DateRangePicker';

const PROPERTY_IMAGE_FALLBACK = PROPERTY_IMAGE_PLACEHOLDER;

const getPropertyCardImage = (item) => {
  const fromImages = getImageUrl(item?.images?.[0]);
  if (fromImages) return fromImages;
  if (!item?.property_id) {
    return getImageUrl(item?.img || item?.image_url) || PROPERTY_IMAGE_FALLBACK;
  }
  return PROPERTY_IMAGE_FALLBACK;
};

const homeSchema = {
  "@context": "https://schema.org",
  "@graph": [
    organizationSchema,
    websiteSchema,
    {
      "@type": "WebPage",
      "@id": "https://x-space360.in/#webpage",
      url: "https://x-space360.in/",
      name: "Book Stays, Workspaces and Event Venues | X-Space360",
      description:
        "Discover and book villas, farmhouses, commercial workspaces and event venues across India.",
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

const DEFAULT_HERO_SLIDES = [
  {
    src: '/videos/hero/pexels-contact-me-923323219715-262056873-12703092.jpg',
    mobilePosition: '58% center',
    tag: 'COMMERCIAL SPACES',
    tagColor: 'text-white',
    titlePrefix: 'Premium Workspaces in ',
    titleHighlight: 'Nashik',
    highlightColor: 'text-white',
    titleSuffix: '',
    badges: ['Raksha Bandhan Special: 10% OFF on Family Stays*']
  },
  {
    src: '/videos/hero/hero-villa-mobile-crop.png',
    mobilePosition: 'center 58%',
    tag: 'RESORT VILLAS',
    tagColor: 'text-white',
    titlePrefix: "Luxury Villas in India's ",
    titleHighlight: 'Wine Capital',
    highlightColor: 'text-white',
    titleSuffix: '',
    badges: ['Gift Your Sibling A Luxury Getaway: Flat 15% OFF*']
  },
  {
    src: '/videos/hero/pexels-thevisionaryvows-33485961.jpg',
    mobilePosition: '58% center',
    tag: 'WEDDING VENUES',
    tagColor: 'text-white',
    titlePrefix: 'Luxury Weddings, ',
    titleHighlight: 'Beautiful Memories',
    highlightColor: 'text-white',
    titleSuffix: '',
    badges: ['Rakhi Special Offer: Flat 20% OFF on Venue Bookings*']
  },
  {
    src: '/videos/hero/pexels-liva-kitchens-and-interiors-2153927697-33452539.jpg',
    mobilePosition: 'left center',
    tag: 'RESIDENTIAL SPACES',
    tagColor: 'text-white',
    titlePrefix: 'Experience the ',
    titleHighlight: 'Comfort of Home',
    highlightColor: 'text-white',
    titleSuffix: '',
    badges: ['Celebrate The Bond: Special Sibling Getaways at 25% OFF*']
  }
];

// Translation Dictionary
const TRANSLATIONS = {
  en: {
    discover: 'Discover',
    howItWorks: 'How it works',
    signIn: 'Sign In',
    getStarted: 'Get Started',
    signOut: 'Sign Out',
    whereToNext: 'Where to next?',
    searchDestinations: 'Search destinations',
    selectDates: 'Select Dates',
    addDates: 'Add dates',
    checkIn: 'Check In',
    checkOut: 'Check Out',
    confirmDates: 'Confirm Dates',
    whosComing: "Who's coming?",
    guests: 'guests',
    search: 'Search',
    adults: 'Adults',
    children: 'Children',
    infants: 'Infants',
    ages18: 'Ages 18+',
    ages617: 'Ages 6-17',
    under5: 'Under 5',
    clear: 'Clear',
    applySearch: 'Apply & Search',
    featuredCollections: 'Featured Collections',
    featuredSub: 'Hand-picked properties that redefine luxury and comfort.',
    viewAll: 'View All Properties',
    residential: 'Residential Collection',
    residentialSub: 'Luxury homes, apartments, and private stays.',
    commercial: 'Commercial Spaces',
    commercialSub: 'Premium offices, co-working spaces, and retail.',
    eventVenue: 'Events & Functions',
    eventVenueSub: 'Banquet halls, garden lawns, and celebration venues.',
    comingSoon: 'New {category} coming soon!',
    topRated: 'Top Rated',
    night: 'night',
    day: 'day',
    hour: 'hr',
    week: 'week',
    month: 'month',
    readyToHost: 'Ready to <span class="text-terracotta underline decoration-sage decoration-4 underline-offset-8">Host</span> with Us?',
    ctaParagraph: "Join India's most exclusive short-term rental network and turn your premium space into a high-yielding asset.",
    listProperty: 'List Your Property',
    learnFees: 'Learn about our fees →',
    guestStories: 'Guest Stories',
    lovedByGuests: 'Loved by Guests & Hosts',
    testimonialsSub: 'Hear from our community members about their experience with X-Space360.',
    ourJournal: 'Our Journal',
    latestBlog: 'Latest from the Blog',
    blogSub: 'Insights and tips on property hosting, travel destinations, and short-term rental trends.',
    readArticle: 'Read Article →',
    footerSub: 'Redefining short-term rentals in India through curation, technology, and superior service.',
    forGuests: 'For Guests',
    browseCollections: 'Browse Collections',
    safetyProtocols: 'Safety Protocols',
    guestSupport: 'Guest Support',
    forHosts: 'For Hosts',
    listSpace: 'List Your Space',
    hostingStandards: 'Hosting Standards',
    payoutSystem: 'Payout System',
    contact: 'Contact',
    mumbaiHQ: 'Nashik, Maharashtra',
    privacy: 'Privacy',
    terms: 'Terms',
    cookies: 'Cookies',
    precision: '© 2026 X-Space360. Owned & Operated by Golden Rich Financial Solutions & Real Estate Solutions Pvt Ltd.',
    modalJourney: 'Host Onboarding Flow',
    modalTitle: 'How Hosting Works',
    modalDesc: 'A simple step-by-step flow for onboarding your property on X-Space360, from account setup to going live.',
    activeStage: 'Step {stage} of 5',
    rmInspection: 'RM Inspection Scheduled',
    auditProgress: 'Audit In-Progress',
    planTrial: 'Trial Enabled',
    selectedPlan: 'Selected',
    netPayout: 'Net Payout:',
    settled: 'Settled',
    onboardingGuidelines: 'Verification Standards',
    guidelineText: 'Every property goes through document checks, listing review, and location verification before it is published on the platform.',
    guidelineBullet1: 'Keep KYC documents, property photos, and address details ready before you begin.',
    guidelineBullet2: 'Any address, ownership, or map mismatch may delay approval until corrected.',
    securePayments: 'Bookings & Payouts',
    paymentsText: 'Once your property is live, bookings and host settlements follow a clear and secure workflow:',
    paymentsBullet1: 'Confirmed bookings are recorded instantly with calendar blocking.',
    paymentsBullet2: 'Guests pay through the platform using secure online payment methods.',
    paymentsBullet3: 'Payouts are released to the verified host account as per platform settlement timelines.',
    startHostingNow: 'Start Hosting Now',
    goHostDashboard: 'Go to Host Dashboard',
    step: 'Step',
    hostAccountSetup: 'Host Account Setup',
    awaitingVerification: 'Awaiting Verification',
    aadhaarId: 'Government Aadhaar ID',
    uploaded: 'Uploaded',
    smsAuth: 'SMS Mobile Auth',
    verified: 'Verified',
    activePlans: 'Active Plans',
    trialEnabled: 'Trial Enabled',
    standardPlan: 'Standard Host Plan',
    threeMosFree: '/ 3 Mos Free',
    selected: 'Selected',
    dynamicListingBuilder: 'Dynamic Listing Builder',
    rmInspectionScheduled: 'RM Inspection Scheduled',
    rmInspectorName: 'RM: Sameer K. (Bandra Zone)',
    coordSync: 'Coord Sync: 19.076N, 72.877E',
    auditInProgress: 'Audit In-Progress',
    payoutSummary: 'Payout Summary',
    bookingId: 'Booking ID: #7890',
    gstRemittance: 'GST Remittance:',
    registrationShort: 'Account',
    registrationHeading: 'Create Your Host Account',
    registrationSubtitle: 'Start with basic details',
    registrationParagraph: 'Register as a host with your name, mobile number, email address, and business basics so the onboarding process can begin smoothly.',
    registrationBullet1: 'Sign up using your active mobile number and email address.',
    registrationBullet2: 'Choose host mode and complete your account profile.',
    registrationBullet3: 'You can continue onboarding from your dashboard anytime.',
    subscriptionShort: 'KYC & Docs',
    subscriptionHeading: 'Complete KYC & Verification',
    subscriptionSubtitle: 'Submit the required documents',
    subscriptionParagraph: 'Select a subscription plan that fits your business model. Each plan starts with an extensive 3-Month Free Trial. Host registration fee is ₹500 (fully refundable during trial evaluation).',
    subscriptionBullet1: 'Standard Plan: Perfect for single property hosts (basic statistics and ticketer support).',
    subscriptionBullet2: 'Growth Plan: Best for multiple properties (adds priorities and WhatsApp notifications).',
    subscriptionBullet3: 'Elite Plan: Dedicated Relationship Manager (RM), featured ranking, and custom contracts.',
    listingShort: 'Listing Builder',
    listingHeading: 'Dynamic Property Creator',
    listingSubtitle: 'Showcase every rich highlight of your space',
    listingParagraph: 'Input comprehensive amenities, check-in instructions, custom rules, daily or hourly renting cycles, and upload high-resolution images of your listing.',
    listingBullet1: 'Raw Image Uploads with instant drag-and-drop thumbnail previews.',
    listingBullet2: 'Dynamic Daily / Hourly pricing configurations based on regional demand.',
    listingBullet3: 'Precise Leaflet map geo-location parameter pinning.',
    auditShort: 'Audit Visit',
    auditHeading: 'On-Site Verification Audit',
    auditSubtitle: 'Mandatory geographical and quality mapping',
    auditParagraph: 'To maintain absolute physical validation and trust in the STR market, a Relationship Manager (RM) physically visits the site to audit exact coordinates and quality checks.',
    auditBullet1: 'Real-time GPS coordinate logging and leaf mapping to prevent ghost listings.',
    auditBullet2: 'Official physical standards audit checklist validation.',
    auditBullet3: 'Secure green trust badge activation on successful audit.',
    earningsShort: 'Live Earnings',
    earningsHeading: 'Live Operations & Secured Payouts',
    earningsSubtitle: 'Accept guest stays and withdraw seamlessly',
    earningsParagraph: 'Your property enters our verified discover index instantly. Take advantage of dynamic checkouts with Razorpay secure signature double locks.',
    earningsBullet1: 'Secure UPI / Card checkouts with instant calendar blocking.',
    earningsBullet2: '10-minute calendar lock protects against concurrent bookings.',
    earningsBullet3: 'Automated bank payouts with professional tax-compliant invoice logs.',
    modalJourney: 'Host Onboarding Flow',
    modalTitle: 'How Hosting Works',
    modalDesc: 'A simple step-by-step flow for onboarding your property on X-Space360, from account setup to going live.',
    activeStage: 'Step {stage} of 5',
    onboardingGuidelines: 'Verification Standards',
    guidelineText: 'Every property goes through document checks, listing review, and location verification before it is published on the platform.',
    guidelineBullet1: 'Keep KYC documents, property photos, and address details ready before you begin.',
    guidelineBullet2: 'Any address, ownership, or map mismatch may delay approval until corrected.',
    securePayments: 'Bookings & Payouts',
    paymentsText: 'Once your property is live, bookings and host settlements follow a clear and secure workflow:',
    paymentsBullet1: 'Confirmed bookings are recorded instantly with calendar blocking.',
    paymentsBullet2: 'Guests pay through the platform using secure online payment methods.',
    paymentsBullet3: 'Payouts are released to the verified host account as per platform settlement timelines.',
    registrationShort: 'Account',
    registrationHeading: 'Create Your Host Account',
    registrationSubtitle: 'Start with basic details',
    registrationParagraph: 'Register as a host with your name, mobile number, email address, and business basics so the onboarding process can begin smoothly.',
    registrationBullet1: 'Sign up using your active mobile number and email address.',
    registrationBullet2: 'Choose host mode and complete your account profile.',
    registrationBullet3: 'You can continue onboarding from your dashboard anytime.',
    subscriptionShort: 'KYC & Docs',
    subscriptionHeading: 'Complete KYC & Verification',
    subscriptionSubtitle: 'Submit the required documents',
    subscriptionParagraph: 'Upload your KYC and business documents for review so your host profile can be verified before listing goes live.',
    subscriptionBullet1: 'Add Aadhaar, PAN, address proof, and host account details.',
    subscriptionBullet2: 'Upload clear and matching documents to avoid delays.',
    subscriptionBullet3: 'The verification team reviews submitted details before approval.',
    listingShort: 'Add Property',
    listingHeading: 'Build Your Property Listing',
    listingSubtitle: 'Show your space clearly',
    listingParagraph: 'Add category, location, pricing, amenities, house rules, and high-quality images so guests get a complete view of the property.',
    listingBullet1: 'Select the right property type and destination.',
    listingBullet2: 'Add pricing, capacity, amenities, and check-in details.',
    listingBullet3: 'Upload strong cover images and complete gallery photos.',
    auditShort: 'Review',
    auditHeading: 'Internal Review & Quality Check',
    auditSubtitle: 'Approval before publishing',
    auditParagraph: 'Our team reviews your property details, documents, and map accuracy to ensure the listing meets platform quality and trust standards.',
    auditBullet1: 'Listing content and media are checked for clarity and accuracy.',
    auditBullet2: 'Map location, ownership details, and category fit are reviewed.',
    auditBullet3: 'Any corrections needed are shared before the property is approved.',
    earningsShort: 'Go Live',
    earningsHeading: 'Go Live & Start Receiving Bookings',
    earningsSubtitle: 'Your listing is now guest-ready',
    earningsParagraph: 'Once approved, your property becomes visible on the platform and you can start receiving bookings, calendar blocks, and host payouts.',
    earningsBullet1: 'Approved listings are published on the discover flow.',
    earningsBullet2: 'Bookings automatically update availability and guest details.',
    earningsBullet3: 'Host payouts are processed to the verified bank account.',
    activePlans: 'Verification Status',
    trialEnabled: 'In Review',
    standardPlan: 'Host Documents',
    threeMosFree: '/ profile check',
    selected: 'Submitted',
    dynamicListingBuilder: 'Property Details',
    rmInspectionScheduled: 'Review Queue',
    rmInspectorName: 'Quality & content review',
    coordSync: 'Location and listing details check',
    auditInProgress: 'Under Review',
    payoutSummary: 'Live Host Status',
    bookingId: 'Listing Visibility',
    gstRemittance: 'Bookings & calendar',
    netPayout: 'Payout setup',
    heroSubTag: 'Short-Term Rentals · India',
    heroTitle: 'Elevated <br /> <span class="text-terracotta italic font-serif">Living</span> & <span class="text-sage font-serif italic">Working</span> Spaces.',
    heroSubtitle: 'Curated residential, commercial, and event venues designed for those who value aesthetics and seamless experiences.',
    heroRating: '4.9/5 Average',
    heroTrusted: 'Trusted by 10k+ guests across Maharashtra & Bangalore.',
    catResidential: 'Residential',
    catCommercial: 'Commercial',
    catEvent: 'Event Venue',
  },
  hi: {
    discover: 'खोजें',
    howItWorks: 'यह कैसे काम करता है',
    signIn: 'लॉगिन करें',
    getStarted: 'शुरू करें',
    signOut: 'साइन आउट',
    whereToNext: 'आगे कहाँ जाना है?',
    searchDestinations: 'गंतव्य खोजें',
    selectDates: 'तारीख चुनें',
    addDates: 'तारीख जोड़ें',
    checkIn: 'चेक इन',
    checkOut: 'चेक आउट',
    confirmDates: 'तारीख की पुष्टि करें',
    whosComing: 'कौन आ रहा है?',
    guests: 'मेहमान',
    search: 'खोजें',
    adults: 'वयस्क',
    children: 'बच्चे',
    infants: 'शिशु',
    ages18: 'उम्र १८+',
    ages617: 'उम्र ६-१७',
    under5: '५ साल से कम',
    clear: 'साफ करें',
    applySearch: 'लागू करें और खोजें',
    featuredCollections: 'चुनिंदा कलेक्शन्स',
    featuredSub: 'लक्जरी और आराम को फिर से परिभाषित करने वाली चुनिंदा संपत्तियां।',
    viewAll: 'सभी संपत्तियां देखें',
    residential: 'आवासीय कलेक्शन',
    residentialSub: 'लक्जरी घर, अपार्टमेंट और निजी आवास।',
    commercial: 'व्यावसायिक स्थान',
    commercialSub: 'प्रीमियम ऑफिस, को-वर्किंग और रिटेल स्थान।',
    eventVenue: 'आयोजन और कार्यक्रम',
    eventVenueSub: 'बैंक्वेट हॉल, रूफटॉप और उत्सव स्थल।',
    comingSoon: 'नया {category} जल्द ही आ रहा है!',
    topRated: 'टॉप रेटेड',
    night: 'रात',
    day: 'दिन',
    hour: 'घंटा',
    week: 'सप्ताह',
    month: 'महीना',
    readyToHost: 'हमारे साथ <span class="text-terracotta underline decoration-sage decoration-4 underline-offset-8">होस्ट</span> करने के लिए तैयार हैं?',
    ctaParagraph: 'भारत के सबसे विशिष्ट शॉर्ट-टर्म रेंटल नेटवर्क में शामिल हों और अपने प्रीमियम स्थान को उच्च-उपज वाली संपत्ति में बदलें।',
    listProperty: 'अपनी संपत्ति सूचीबद्ध करें',
    learnFees: 'हमारी फीस के बारे में जानें →',
    guestStories: 'मेहमानों की कहानियाँ',
    lovedByGuests: 'मेहमानों और मेजबानों का पसंदीदा',
    testimonialsSub: 'गोल्डन रिच स्टे के साथ अनुभव के बारे में हमारे समुदाय के सदस्यों से सुनें।',
    ourJournal: 'हमारा जर्नल',
    latestBlog: 'ब्लॉग से नवीनतम',
    blogSub: 'संपत्ति की मेजबानी, यात्रा स्थलों और शॉर्ट-टर्म रेंटल ट्रेंड पर अंतर्दृष्टि और सुझाव।',
    readArticle: 'लेख पढ़ें →',
    footerSub: 'क्यूरेशन, तकनीक और बेहतर सेवा के माध्यम से भारत में शॉर्ट-टर्म रेंटल को फिर से परिभाषित करना।',
    forGuests: 'मेहमानों के लिए',
    browseCollections: 'कलेक्शन ब्राउज़ करें',
    safetyProtocols: 'सुरक्षा नियम',
    guestSupport: 'ग्राहक सेवा',
    forHosts: 'मेजबानों के लिए',
    listSpace: 'अपना स्थान सूचीबद्ध करें',
    hostingStandards: 'मेजबानी के मानक',
    payoutSystem: 'पेआउट प्रणाली',
    contact: 'संपर्क',
    mumbaiHQ: 'नाशिक, महाराष्ट्र',
    privacy: 'गोपनीयता',
    terms: 'नियम और शर्तें',
    cookies: 'कुकीज़',
    precision: '© 2026 X-Space360. Owned & Operated by Golden Rich Financial Solutions & Real Estate Solutions Pvt Ltd.',
    modalJourney: 'इंटरएक्टिव होस्ट ऑनबोर्डिंग यात्रा',
    modalTitle: 'यह कैसे काम करता है: चरण-दर-चरण',
    modalDesc: 'गोल्डन रिच स्टे एक पूर्णतः एकीकृत, प्रीमियम, भौतिक रूप से सत्यापित शॉर्ट-टर्म रेंटल प्रणाली प्रदान करता है। हमारे इंटरएक्टिव होस्ट पाइपलाइन का पता लगाने के लिए नीचे दिए गए चरणों पर क्लिक करें।',
    activeStage: 'सक्रिय चरण {stage} का ५',
    rmInspection: 'आरएम निरीक्षण निर्धारित',
    auditProgress: 'ऑडिट प्रगति पर',
    planTrial: 'ट्रायल सक्रिय',
    selectedPlan: 'चयनित',
    netPayout: 'शुद्ध भुगतान:',
    settled: 'भुगतान संपन्न',
    onboardingGuidelines: 'इंटरएक्टिव सत्यापन दिशानिर्देश',
    guidelineText: 'प्रीमियम रेंटल के लिए अधिकतम विश्वास सुनिश्चित करने के लिए, प्रत्येक सूचीबद्ध स्थान समन्वय पार्सिंग और लीफलेट जियोफेंसिंग सत्यापन से गुजरता है। जब कोई मेजबान संपत्ति जमा करता है, तो सत्यापन सेवा एक फील्ड निरीक्षक नियुक्त करती है।',
    guidelineBullet1: 'मैनुअल जीपीएस सत्यापन लिस्टिंग को क्लोन धोखाधड़ी से बचाता है।',
    guidelineBullet2: 'एलीट बैज डिस्कवर पेज विजिबिलिटी में २.५ गुना बढ़ोतरी करता है।',
    securePayments: 'सुरक्षित भुगतान और गारंटी',
    paymentsText: 'हम स्वचालित चेकआउट लॉक का उपयोग करके मेजबान भुगतानों को सुरक्षित करते हैं। जब मेहमान भुगतान शुरू करता है:',
    paymentsBullet1: '१०-मिनट का लॉक कैलेंडर डबल बुकिंग से बचाता है।',
    paymentsBullet2: 'डायनेमिक सिग्नेचर की सत्यापन सुरक्षित ट्रांसफर प्रोटोकॉल की गारंटी देता है।',
    paymentsBullet3: 'सीधा बैंक निपटान आपके खाते में निर्बाध रूप से धनराशि स्थानांतरित करता है।',
    startHostingNow: 'अभी होस्टिंग शुरू करें',
    goHostDashboard: 'मेजबान डैशबोर्ड पर जाएं',
    step: 'चरण',
    hostAccountSetup: 'मेजबान खाता सेटअप',
    awaitingVerification: 'सत्यापन की प्रतीक्षा में',
    aadhaarId: 'सरकारी आधार आईडी',
    uploaded: 'अपलोड किया गया',
    smsAuth: 'एसएमएस मोबाइल प्रमाणीकरण',
    verified: 'सत्यापित',
    activePlans: 'सक्रिय योजनाएं',
    trialEnabled: 'ट्रायल सक्रिय',
    standardPlan: 'मानक मेजबान योजना',
    threeMosFree: '/ ३ महीने मुफ्त',
    selected: 'चयनित',
    dynamicListingBuilder: 'गतिशील लिस्टिंग निर्माता',
    rmInspectionScheduled: 'आरएम निरीक्षण निर्धारित',
    rmInspectorName: 'आरएम: समीर के. (बांद्रा जोन)',
    coordSync: 'समन्वय सिंक: 19.076N, 72.877E',
    auditInProgress: 'ऑडिट प्रगति पर',
    payoutSummary: 'भुगतान सारांश',
    bookingId: 'बुकिंग आईडी: #7890',
    gstRemittance: 'जीएसटी प्रेषण:',
    registrationShort: 'पंजीकरण',
    registrationHeading: 'मेजबान पंजीकरण और पहचान सत्यापन',
    registrationSubtitle: 'पूर्ण सुरक्षा और विश्वास स्थापित करें',
    registrationParagraph: 'अतिथि सुरक्षा बनाए रखने के लिए प्रत्येक मेजबान प्रोफाइल को सुरक्षित क्रेडेंशियल्स के माध्यम से सत्यापित किया जाता है। सत्यापन प्रक्रिया पूरी तरह से स्वचालित है और इसमें 5 मिनट से कम समय लगता है।',
    registrationBullet1: 'सरकारी केवाईसी और आधार आईडी सत्यापन सहायता।',
    registrationBullet2: 'वास्तविक समय में एसएमएस और व्हाट्सएप ऑनबोर्डिंग पुष्टिकरण।',
    registrationBullet3: 'एक क्लिक में अतिथि और मेजबान मोड के बीच निर्बाध खाता स्विचिंग।',
    subscriptionShort: 'सदस्यता',
    subscriptionHeading: 'लचीली सदस्यता श्रेणियां',
    subscriptionSubtitle: 'आपके किराये के पोर्टफोलियो के साथ स्केल करने के लिए डिज़ाइन किया गया',
    subscriptionParagraph: 'एक सदस्यता योजना चुनें जो आपके व्यावसायिक मॉडल के अनुकूल हो। प्रत्येक योजना एक विस्तृत 3-महीने के मुफ्त परीक्षण के साथ शुरू होती है। मेजबान पंजीकरण शुल्क ₹500 है (मूल्यांकन के दौरान पूरी तरह से वापसी योग्य)।',
    subscriptionBullet1: 'मानक योजना: एकल संपत्ति मेजबानों के लिए बिल्कुल सही (बुनियादी सांख्यिकी और टिकट सहायता)।',
    subscriptionBullet2: 'विकास योजना: कई संपत्तियों के लिए सर्वश्रेष्ठ (प्राथमिकताएं और व्हाट्सएप सूचनाएं जोड़ता है)।',
    subscriptionBullet3: 'एलीट योजना: समर्पित संबंध प्रबंधक (आरएम), चुनिंदा रैंकिंग और कस्टम अनुबंध।',
    listingShort: 'लिस्टिंग बिल्डर',
    listingHeading: 'गतिशील संपत्ति निर्माता',
    listingSubtitle: 'अपने स्थान की हर समृद्ध विशेषता को प्रदर्शित करें',
    listingParagraph: 'व्यापक सुविधाएं, चेक-इन निर्देश, कस्टम नियम, दैनिक या प्रति घंटा किराये के चक्र दर्ज करें और अपनी लिस्टिंग की उच्च-रिज़ॉल्यूशन छवियां अपलोड करें।',
    listingBullet1: 'त्वरित ड्रैग-एंड-ड्रॉप थंबनेल पूर्वावलोकन के साथ कच्ची छवियां अपलोड।',
    listingBullet2: 'क्षेत्रीय मांग के आधार पर गतिशील दैनिक / प्रति घंटा मूल्य निर्धारण कॉन्फ़िगरेशन।',
    listingBullet3: 'सटीक लीफलेट मानचित्र भू-स्थान पिनिंग।',
    auditShort: 'ऑडिट विजिट',
    auditHeading: 'ऑन-साइट सत्यापन ऑडिट',
    auditSubtitle: 'अनिवार्य भौगोलिक और गुणवत्ता मानचित्रण',
    auditParagraph: 'शॉर्ट-टर्म रेंटल बाजार में पूर्ण भौतिक सत्यापन और विश्वास बनाए रखने के लिए, एक संबंध प्रबंधक (आरएम) सटीक निर्देशांक और गुणवत्ता जांच के लिए साइट का दौरा करता है।',
    auditBullet1: 'घोस्ट लिस्टिंग को रोकने के लिए वास्तविक समय जीपीएस निर्देशांक लॉगिंग और मैपिंग।',
    auditBullet2: 'आधिकारिक भौतिक मानक ऑडिट चेकलिस्ट सत्यापन।',
    auditBullet3: 'सफल ऑडिट पर सुरक्षित ग्रीन ट्रस्ट बैज सक्रियण।',
    earningsShort: 'लाइव कमाई',
    earningsHeading: 'लाइव संचालन और सुरक्षित भुगतान',
    earningsSubtitle: 'अतिथि आवास स्वीकार करें और निर्बाध रूप से वापस लें',
    earningsParagraph: 'आपकी संपत्ति तुरंत हमारे सत्यापित खोज इंडेक्स में प्रवेश करती है। रेज़रपे सुरक्षित हस्ताक्षर डबल लॉक के साथ गतिशील चेकआउट का लाभ उठाएं।',
    earningsBullet1: 'त्वरित कैलेंडर ब्लॉकिंग के साथ सुरक्षित यूपीआई / कार्ड चेकआउट।',
    earningsBullet2: '10 मिनट का कैलेंडर लॉक समवर्ती बुकिंग से बचाता है।',
    earningsBullet3: 'पेशेवर टैक्स-अनुपालन चालान लॉग के साथ स्वचालित बैंक भुगतान।',
    heroSubTag: 'शॉर्ट-टर्म रेंटल · भारत',
    heroTitle: 'उन्नत <br /> <span class="text-terracotta italic font-serif">रहने</span> और <span class="text-sage font-serif italic">काम करने</span> के स्थान।',
    heroSubtitle: 'सौंदर्यशास्त्र और निर्बाध अनुभवों को महत्व देने वालों के लिए डिज़ाइन किए गए आवासीय, व्यावसायिक और आयोजन स्थल।',
    heroRating: '4.9/5 औसत',
    heroTrusted: 'महाराष्ट्र और बैंगलोर में 10k+ मेहमानों द्वारा विश्वसनीय।',
    catResidential: 'आवासीय',
    catCommercial: 'व्यावसायिक',
    catEvent: 'आयोजन स्थल',
  },
  mr: {
    discover: 'शोधा',
    howItWorks: 'हे कसे कार्य करते',
    signIn: 'लॉगिन करा',
    getStarted: 'सुरू करा',
    signOut: 'साइन आउट',
    whereToNext: 'पुढे कुठे जायचे?',
    searchDestinations: 'ठिकाण शोधा',
    selectDates: 'तारीख निवडा',
    addDates: 'तारीख जोडा',
    checkIn: 'चेक इन',
    checkOut: 'चेक आउट',
    confirmDates: 'तारीख निश्चित करा',
    whosComing: 'कोण येत आहे?',
    guests: 'पाहुणे',
    search: 'शोधा',
    adults: 'प्रौढ',
    children: 'मुले',
    infants: 'लहान मुले',
    ages18: 'वय १८+',
    ages617: 'वय ६-१७',
    under5: '५ वर्षांखालील',
    clear: 'क्लियर करा',
    applySearch: 'लागू करा आणि शोधा',
    featuredCollections: 'वैशिष्ट्यीकृत कलेक्शन',
    featuredSub: 'लक्झरी आणि सोयीची व्याख्या बदलणाऱ्या निवडक प्रॉपर्टीज.',
    viewAll: 'सर्व प्रॉपर्टीज पहा',
    residential: 'निवासी कलेक्शन',
    residentialSub: 'लक्झरी घरे, अपार्टमेंट्स आणि खाजगी जागा.',
    commercial: 'व्यावसायिक जागा',
    commercialSub: 'प्रीमियम ऑफिस, को-वर्किंग आणि रिटेल जागा.',
    eventVenue: 'इव्हेंट्स आणि फंक्शन्स',
    eventVenueSub: 'बँक्वेट हॉल, रूफटॉप आणि सेलिब्रेशनच्या जागा.',
    comingSoon: 'नवीन {category} लवकरच येत आहे!',
    topRated: 'Top Rated',
    night: 'रात्र',
    day: 'दिवस',
    hour: 'तास',
    week: 'आठवडा',
    month: 'महिना',
    readyToHost: 'आमच्यासोबत <span class="text-terracotta underline decoration-sage decoration-4 underline-offset-8">होस्ट</span> बनण्यास तयार आहात का?',
    ctaParagraph: 'भारतातील सर्वात अनन्य शॉर्ट-टर्म रेंटल नेटवर्कमध्ये सामील व्हा आणि तुमच्या प्रीमियम जागेला अधिक उत्पन्न मिळवून देणाऱ्या मालमत्तेत बदला.',
    listProperty: 'तुमची प्रॉपर्टी लिस्ट करा',
    learnFees: 'आमच्या शुल्काबद्दल जाणून घ्या →',
    guestStories: 'पाहुण्यांचे अनुभव',
    lovedByGuests: 'पाहुणे आणि होस्ट दोघांचे आवडते',
    testimonialsSub: 'आमच्या कम्युनिटी सदस्यांकडून त्यांच्या X-Space360 सोबतच्या अनुभवांबद्दल जाणून घ्या.',
    ourJournal: 'आमचे जर्नल',
    latestBlog: 'ब्लॉगवरील नवीनतम लेख',
    blogSub: 'प्रॉपर्टी होस्टिंग, प्रवासाची ठिकाणे आणि शॉर्ट-टर्म रेंटल ट्रेंड्सबद्दल माहिती आणि टिप्स.',
    readArticle: 'लेख वाचा →',
    footerSub: 'क्यूरेशन, तंत्रज्ञान आणि उत्कृष्ट सेवेद्वारे भारतातील शॉर्ट-टर्म रेंटल्सची नव्याने व्याख्या करत आहोत.',
    forGuests: 'पाहुण्यांसाठी',
    browseCollections: 'कलेक्शन्स ब्राउझ करा',
    safetyProtocols: 'सुरक्षा नियम',
    guestSupport: 'ग्राहक सेवा',
    forHosts: 'होस्टसाठी',
    listSpace: 'तुमची जागा लिस्ट करा',
    hostingStandards: 'होस्टिंगचे निकष',
    payoutSystem: 'पेऑउट प्रणाली',
    contact: 'संपर्क',
    mumbaiHQ: 'नाशिक, महाराष्ट्र',
    privacy: 'गोपनीयता',
    terms: 'अटी आणि शर्ती',
    cookies: 'कुकीज',
    precision: '© 2026 X-Space360. Owned & Operated by Golden Rich Financial Solutions & Real Estate Solutions Pvt Ltd.',
    modalJourney: 'इंटरएक्टिव्ह होस्ट ऑनबोर्डिंग प्रवास',
    modalTitle: 'हे कसे कार्य करते: पायरी-दर-पायरी',
    modalDesc: 'X-Space360 एक पूर्णतः एकात्मिक, premium, प्रत्यक्ष सत्यापित शॉर्ट-टर्म रेंटिंग प्रणाली प्रदान करते. आमच्या परस्परसंवादी होस्ट पाइपलाइनचा शोध घेण्यासाठी खालील पायऱ्यांवर क्लिक करा.',
    activeStage: 'सक्रिय टप्पा {stage} पैकी ५',
    rmInspection: 'आरएम तपासणी नियोजित',
    auditProgress: 'तपासणी सुरू आहे',
    planTrial: 'चाचणी सुरू',
    selectedPlan: 'निवडलेले',
    netPayout: 'निव्वळ पेआउट:',
    settled: 'पेमेंट जमा झाले',
    onboardingGuidelines: 'परस्परसंवादी पडताळणी मार्गदर्शक तत्त्वे',
    guidelineText: 'प्रीमियम भाड्यासाठी जास्तीत जास्त विश्वास सुनिश्चित करण्यासाठी, प्रत्येक सूचीबद्ध जागा समन्वय पार्सिंग आणि लीफलेट जिओफेन्सिंग पडताळणीमधून जाते. जेव्हा एखादा होस्ट मालमत्ता सबमिट करतो, तेव्हा पडताळणी सेवा फील्ड निरीक्षक नियुक्त करते.',
    guidelineBullet1: 'मॅन्युअल जीपीएस पडताळणी क्लोन फसवणुकीपासून लिस्टिंगचे संरक्षण करते.',
    guidelineBullet2: 'एलीट बॅज शोध पृष्ठावरील दृश्यमानतेमध्ये २.५ पट वाढ करतो.',
    securePayments: 'सुरक्षित पेमेंट आणि हमी',
    paymentsText: 'आम्ही स्वयंचलित चेकआउट लॉक वापरून होस्ट पेमेंट सुरक्षित करतो. जेव्हा अतिथी पेमेंट सुरू करतो:',
    paymentsBullet1: '१०-मिनिटांचा लॉक कॅलेंडर डबल बुकिंगपासून संरक्षण करतो.',
    paymentsBullet2: 'डायनेमिक स्वाक्षरी की पडताळणी सुरक्षित हस्तांतरण प्रोटोकॉल की हमी देते.',
    paymentsBullet3: 'थेट बँक सेटलमेंट आपल्या खात्यात अखंडपणे निधी हस्तांतरित करते.',
    startHostingNow: 'आता होस्टिंग सुरू करा',
    goHostDashboard: 'होस्ट डॅशबोर्डवर जा',
    step: 'पायरी',
    hostAccountSetup: 'होस्ट खाते सेटअप',
    awaitingVerification: 'पडताळणीची प्रतीक्षा',
    aadhaarId: 'सरकारी आधार आयडी',
    uploaded: 'अपलोड केले',
    smsAuth: 'एसएमएस मोबाईल प्रमाणीकरण',
    verified: 'सत्यापित',
    activePlans: 'सक्रिय योजना',
    trialEnabled: 'चाचणी सुरू',
    standardPlan: 'स्टँडर्ड होस्ट प्लॅन',
    threeMosFree: '/ ३ महिने मोफत',
    selected: 'निवडलेले',
    dynamicListingBuilder: 'डायनॅमिक लिस्टिंग बिल्डर',
    rmInspectionScheduled: 'आरएम तपासणी नियोजित',
    rmInspectorName: 'RM: समीर के. (वांद्रे झोन)',
    coordSync: 'समन्वय सिंक: 19.076N, 72.877E',
    auditInProgress: 'तपासणी सुरू आहे',
    payoutSummary: 'पेआउट सारांश',
    bookingId: 'बुकिंग आयडी: #७८९०',
    gstRemittance: 'जीएसटी भरणा:',
    registrationShort: 'नोंदणी',
    registrationHeading: 'होस्ट नोंदणी आणि आयडी पडताळणी',
    registrationSubtitle: 'पूर्ण सुरक्षा आणि विश्वास स्थापित करा',
    registrationParagraph: 'अतिथी सुरक्षितता राखण्यासाठी प्रत्येक होस्ट प्रोफाइल सुरक्षित क्रेडेंशियल्सद्वारे सत्यापित केले जाते. पडताळणी प्रक्रिया पूर्णपणे स्वयंचलित आहे आणि याला ५ मिनिटांपेक्षा कमी वेळ लागतो.',
    registrationBullet1: 'सरकारी केवायसी आणि आधार आयडी पडताळणी सपोर्ट.',
    registrationBullet2: 'रिअल-टाइम एसएमएस आणि व्हॉट्सॲप ऑनबोर्डिंग पुष्टीकरण.',
    registrationBullet3: 'एका क्लिकवर गेस्ट आणि होस्ट मोडमध्ये अखंड खाते स्विचिंग.',
    subscriptionShort: 'सदस्यत्व',
    subscriptionHeading: 'लवचिक सदस्यत्व स्तर',
    subscriptionSubtitle: 'तुमच्या रेंटिंग पोर्टफोलिओनुसार वाढवण्यासाठी डिझाइन केलेले',
    subscriptionParagraph: 'तुमच्या बिझनेस मॉडेलला अनुकूल असलेली सदस्यत्व योजना निवडा. प्रत्येक योजना ३ महिन्यांच्या मोफत चाचणीने सुरू होते. होस्ट नोंदणी फी ₹५०० आहे (चाचणी मूल्यांकनादरम्यान पूर्णपणे परतावायोग्य).',
    subscriptionBullet1: 'स्टँडर्ड प्लॅन: एकाच प्रॉपर्टीच्या होस्टसाठी योग्य (बेसिक आकडेवारी आणि तिकीट सपोर्ट).',
    subscriptionBullet2: 'ग्रोथ प्लॅन: एकाधिक प्रॉपर्टीसाठी सर्वोत्तम (प्राधान्य आणि व्हॉट्सॲप सूचना जोडते).',
    subscriptionBullet3: 'एलीट प्लॅन: समर्पित रिलेशनशिप मॅनेजर (RM), वैशिष्ट्यीकृत रँकिंग आणि सानुकूल करार.',
    listingShort: 'लिस्टिंग बिल्डर',
    listingHeading: 'डायनॅमिक प्रॉपर्टी क्रिएटर',
    listingSubtitle: 'तुमच्या जागेचे प्रत्येक वैशिष्ट्य प्रदर्शित करा',
    listingParagraph: 'सर्वसमावेशक सुविधा, चेक-इन सूचना, सानुकूल नियम, दैनिक किंवा तासांचे भाडे चक्र प्रविष्ट करा आणि तुमच्या लिस्टिंगचे उच्च-रिझॉल्यूशन फोटो अपलोड करा.',
    listingBullet1: 'झटपट ड्रॅग-अँड-ड्रॉप थंबनेल पूर्वावलोकनासह फोटो अपलोड.',
    listingBullet2: 'प्रादेशिक मागणीच्या आधारे दर कॉन्फिग्रेशन.',
    listingBullet3: 'अचूक लीफलेट नकाशा भौगोलिक-स्थान पिनिंग.',
    auditShort: 'तпасणी भेट',
    auditHeading: 'ऑन-साइट पडताळणी ऑडिट',
    auditSubtitle: 'अनिवार्य भौगोलिक आणि गुणवत्ता मॅपिंग',
    auditParagraph: 'शॉर्ट-टर्म रेंटल मार्केटमध्ये पूर्ण भौतिक पडताळणी आणि विश्वास राखण्यासाठी, एक रिलेशनशिप मॅनेजर (RM) अचूक समन्वय आणि गुणवत्ता तपासणीसाठी प्रत्यक्ष भेट देतो.',
    auditBullet1: 'खोट्या लिस्टिंग रोखण्यासाठी रिअल-टाइम जीपीएस समन्वय लॉगिंग आणि मॅपिंग.',
    auditBullet2: 'अधिकृत भौतिक मानक ऑडिट चेकलिस्ट पडताळणी.',
    auditBullet3: 'यशस्वी ऑडिटवर सुरक्षित ग्रीन ट्रस्ट बॅज सक्रिय करणे.',
    earningsShort: 'लाइव कमाई',
    earningsHeading: 'लाइव्ह ऑपरेशन्स आणि सुरक्षित पेआउट्स',
    earningsSubtitle: 'अतिथींचे बुकिंग स्वीकारा आणि अखंडपणे पैसे काढा',
    earningsParagraph: 'तुमची प्रॉपर्टी लगेच आमच्या सत्यापित शोध इंडेक्समध्ये समाविष्ट होते. रेझरपे सुरक्षित स्वाक्षरी डबल लॉकसह डायनॅमिक चेकआउटचा लाभ घ्या.',
    earningsBullet1: 'झटपट कॅलेंडर ब्लॉकिंगसह सुरक्षित यूपीआई / कार्ड चेकआउट.',
    earningsBullet2: '१०-मिनिटांचा कॅलेंडर लॉक एकाच वेळी होणाऱ्या बुकिंगपासून संरक्षण करतो.',
    earningsBullet3: 'व्यावसायिक कर-सुसंगत इनव्हॉइस लॉगसह स्वयंचलित बँक पेआउट्स.',
    heroSubTag: 'शॉर्ट-टर्म रेंटल्स · भारत',
    heroTitle: 'प्रगत <br /> <span class="text-terracotta italic font-serif">राहण्याच्या</span> आणि <span class="text-sage font-serif italic">काम करण्याच्या</span> जागा.',
    heroSubtitle: 'सौंदर्यशास्त्र आणि सुलभ अनुभवांना महत्त्व देणाऱ्यांसाठी डिझाइन केलेले निवडक निवासी, व्यावसायिक आणि इव्हेंट वेन्यू.',
    heroRating: '४.९/५ सरासरी',
    heroTrusted: 'महाराष्ट्र आणि बंगलोरमधील १० हजार+ पाहुण्यांचा विश्वास.',
    catResidential: 'निवासी',
    catCommercial: 'व्यावसायिक',
    catEvent: 'इव्हेंट वेन्यू',
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
      { label: 'Browse Space', action_type: 'link', link: '/guest/browse', text: '' },
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

// Custom Stateful & Interactive How It Works Modal Component
const HowItWorksModal = ({ isOpen, onClose, user, navigate, steps, t }) => {
  const [activeStep, setActiveStep] = useState(1);

  if (!isOpen) return null;

  const stepsData = steps || [
    {
      id: 1,
      icon: User,
      shortTitle: 'Registration',
      heading: 'Host Registration & ID Verification',
      subtitle: 'Establish absolute safety and trust',
      paragraph: 'Every host profile is verified through secured credentials to maintain guest safety. The verification process is completely automated and takes less than 5 minutes.',
      bullets: [
        'Government KYC & Aadhaar ID verification support.',
        'Real-time SMS & WhatsApp onboarding confirmations.',
        'Seamless account switching between Guest and Host mode in one click.'
      ]
    },
    {
      id: 2,
      icon: CreditCard,
      shortTitle: 'Subscription',
      heading: 'Flexible Subscription Tiers',
      subtitle: 'Designed to scale with your renting portfolio',
      paragraph: 'Select a subscription plan that fits your business model. Each plan starts with an extensive 3-Month Free Trial. Host registration fee is ₹500 (fully refundable during trial evaluation).',
      bullets: [
        'Standard Plan: Perfect for single property hosts (basic statistics and ticketer support).',
        'Growth Plan: Best for multiple properties (adds priorities and WhatsApp notifications).',
        'Elite Plan: Dedicated Relationship Manager (RM), featured ranking, and custom contracts.'
      ]
    },
    {
      id: 3,
      icon: Building2,
      shortTitle: 'Listing Builder',
      heading: 'Dynamic Property Creator',
      subtitle: 'Showcase every rich highlight of your space',
      paragraph: 'Input comprehensive amenities, check-in instructions, custom rules, daily or hourly renting cycles, and upload high-resolution images of your listing.',
      bullets: [
        'Raw Image Uploads with instant drag-and-drop thumbnail previews.',
        'Dynamic Daily / Hourly pricing configurations based on regional demand.',
        'Precise Leaflet map geo-location parameter pinning.'
      ]
    },
    {
      id: 4,
      icon: MapPin,
      shortTitle: 'Audit Visit',
      heading: 'On-Site Verification Audit',
      subtitle: 'Mandatory geographical and quality mapping',
      paragraph: 'To maintain absolute physical validation and trust in the STR market, a Relationship Manager (RM) physically visits the site to audit exact coordinates and quality checks.',
      bullets: [
        'Real-time GPS coordinate logging and leaf mapping to prevent ghost listings.',
        'Official physical standards audit checklist validation.',
        'Secure green trust badge activation on successful audit.'
      ]
    },
    {
      id: 5,
      icon: Sparkles,
      shortTitle: 'Live Earnings',
      heading: 'Live Operations & Secured Payouts',
      subtitle: 'Accept guest stays and withdraw seamlessly',
      paragraph: 'Your property enters our verified discover index instantly. Take advantage of dynamic checkouts with Razorpay secure signature double locks.',
      bullets: [
        'Secure UPI / Card checkouts with instant calendar blocking.',
        '10-minute calendar lock protects against concurrent bookings.',
        'Automated bank payouts with professional tax-compliant invoice logs.'
      ]
    }
  ];

  const currentStepData = stepsData.find(s => s.id === activeStep) || stepsData[0];

  return (
    <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md flex items-center justify-center z-[99999] p-4 md:p-6 transition-all duration-300 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[85vh] overflow-hidden shadow-elevated border border-gray-100 flex flex-col relative animate-scale-up">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full bg-gray-50 hover:bg-terracotta hover:text-white flex items-center justify-center transition-all text-charcoal shadow-sm hover:scale-[1.02] active:scale-95"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto p-6 md:p-10 custom-scrollbar w-full h-full">
          {/* Modal Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-terracotta/10 text-terracotta font-semibold tracking-tight text-[10px] uppercase tracking-[0.2em] mb-4 animate-pulse">
            {t('modalJourney')}
          </span>
          <h3 className="text-3xl md:text-5xl font-bold tracking-tight text-charcoal tracking-tight mb-4">
            {t('modalTitle')}
          </h3>
          <p className="text-charcoal-light font-medium text-base md:text-lg leading-relaxed">
            {t('modalDesc')}
          </p>
        </div>

        {/* Interactive Timeline Progress */}
        <div className="relative mb-12 max-w-4xl mx-auto w-full px-4">
          {/* Timeline background line for desktop */}
          <div className="hidden md:block absolute top-[32px] left-[10%] right-[10%] h-[4px] bg-sand-200 z-0 rounded-full"></div>
          
          {/* Active Progress Bar */}
          <div 
            className="hidden md:block absolute top-[32px] left-[10%] h-[4px] bg-gradient-to-r from-terracotta to-sage z-0 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(activeStep - 1) * 20}%` }}
          ></div>

          <div className="flex overflow-x-auto no-scrollbar md:grid md:grid-cols-5 relative z-10 justify-between gap-3 md:gap-3 pb-2">
            {stepsData.map((step) => {
              const isActive = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`rounded-2xl border p-4 text-left transition flex-shrink-0 w-[152px] md:w-auto ${
                    isActive
                      ? 'border-terracotta/30 bg-terracotta/[0.08] shadow-sm'
                      : 'border-gray-100 bg-white hover:border-terracotta/20 hover:bg-stone/40'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                      isActive ? 'bg-terracotta text-white' : 'bg-stone text-charcoal'
                    }`}
                  >
                    {step.id}
                  </div>
                  <span className="mt-4 block text-[10px] font-semibold uppercase tracking-[0.22em] text-charcoal-muted">
                    {t('step')} {step.id}
                  </span>
                  <span className="mt-1 block text-sm font-semibold leading-5 text-charcoal">
                    {step.shortTitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Step Details Panel with dynamic transitions */}
        <div className="bg-stone/70 border border-gray-100/80 rounded-2xl p-6 md:p-8 mb-8 grid md:grid-cols-12 gap-8 items-center min-h-[320px] transition-all duration-500 transform">
          
          {/* Left Column: Descriptions */}
          <div className="md:col-span-7 space-y-4 animate-slide-up">
            <span className="inline-block px-3 py-1 rounded-full bg-sage/10 text-sage font-semibold tracking-tight text-[9px] uppercase tracking-widest">
              {t('activeStage').replace('{stage}', activeStep)}
            </span>
            <h4 className="text-2xl md:text-3xl font-bold tracking-tight text-charcoal tracking-tight transition-all duration-300">
              {currentStepData.heading}
            </h4>
            <p className="text-sm font-semibold tracking-tight text-terracotta italic font-serif">
              {currentStepData.subtitle}
            </p>
            <p className="text-charcoal-light text-sm font-semibold leading-relaxed">
              {currentStepData.paragraph}
            </p>
            
            <div className="space-y-2 pt-2">
              {currentStepData.bullets.map((bullet, idx) => (
                <div key={idx} className="flex items-start space-x-3 text-xs font-bold text-charcoal-muted">
                  <span className="text-terracotta font-bold tracking-tight mt-0.5">•</span>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Visual Dashboard Mockup Card */}
          <div className="md:col-span-5 flex justify-center animate-fade-in">
            <div className="bg-white border border-gray-100/80 rounded-2xl p-6 shadow-subtle w-full max-w-[280px] transform hover:rotate-1 hover:scale-[1.02] transition-all duration-300">
              {activeStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 border-b border-sand-100 pb-3">
                    <div className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center text-sage font-bold tracking-tight">
                      U
                    </div>
                    <div>
                      <h6 className="text-xs font-bold tracking-tight text-charcoal">{t('hostAccountSetup')}</h6>
                      <p className="text-[9px] text-sage font-bold uppercase tracking-wider">{t('awaitingVerification')}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-6 bg-stone rounded border border-sand-100 flex items-center justify-between px-2.5">
                      <span className="text-[9px] text-charcoal-muted font-bold">{t('aadhaarId')}</span>
                      <span className="text-[8px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold tracking-tight">{t('uploaded')}</span>
                    </div>
                    <div className="h-6 bg-stone rounded border border-sand-100 flex items-center justify-between px-2.5">
                      <span className="text-[9px] text-charcoal-muted font-bold">{t('smsAuth')}</span>
                      <span className="text-[8px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold tracking-tight">{t('verified')}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-sand-100 pb-3">
                    <h6 className="text-xs font-bold tracking-tight text-charcoal">{t('activePlans')}</h6>
                    <span className="text-[8px] bg-terracotta/10 text-terracotta px-1.5 py-0.5 rounded-full font-bold tracking-tight">{t('trialEnabled')}</span>
                  </div>
                  <div className="border border-terracotta bg-terracotta/5 rounded-xl p-3 text-center space-y-1">
                    <p className="text-[9px] text-charcoal-muted font-bold tracking-tight uppercase tracking-wider">{t('standardPlan')}</p>
                    <p className="text-lg font-bold tracking-tight text-terracotta">₹500 <span className="text-[10px] text-charcoal-muted font-medium">{t('threeMosFree')}</span></p>
                    <div className="w-full bg-terracotta text-white py-1 rounded text-[8px] font-bold tracking-tight uppercase tracking-widest mt-2">{t('selected')}</div>
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="space-y-4">
                  <h6 className="text-xs font-bold tracking-tight text-charcoal border-b border-sand-100 pb-3">{t('dynamicListingBuilder')}</h6>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-50 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-50 rounded w-1/2"></div>
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div className="aspect-square bg-gray-50 rounded border border-gray-100 flex items-center justify-center text-[10px] text-charcoal-muted font-bold tracking-tight">🏠</div>
                      <div className="aspect-square bg-gray-50 rounded border border-gray-100 flex items-center justify-center text-[10px] text-charcoal-muted font-bold tracking-tight">📍</div>
                      <div className="aspect-square bg-gray-50 rounded border border-gray-100 flex items-center justify-center text-[10px] text-charcoal-muted font-bold tracking-tight">📸</div>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 border-b border-sand-100 pb-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping"></div>
                    <h6 className="text-xs font-bold tracking-tight text-charcoal">{t('rmInspectionScheduled')}</h6>
                  </div>
                  <div className="bg-stone rounded-xl p-3 border border-sand-100 text-center space-y-1">
                    <p className="text-[9px] text-charcoal font-bold tracking-tight">{t('rmInspectorName')}</p>
                    <p className="text-[8px] text-charcoal-muted font-bold">{t('coordSync')}</p>
                    <div className="text-[8px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-bold tracking-tight inline-block mt-2">{t('auditInProgress')}</div>
                  </div>
                </div>
              )}

              {activeStep === 5 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-sand-100 pb-3">
                    <h6 className="text-xs font-bold tracking-tight text-charcoal">{t('payoutSummary')}</h6>
                    <span className="text-[8px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold tracking-tight">{t('settled')}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-bold">
                      <span className="text-charcoal-muted">{t('bookingId')}</span>
                      <span className="text-charcoal">₹18,500</span>
                    </div>
                    <div className="flex justify-between text-[9px] font-bold">
                      <span className="text-charcoal-muted">{t('gstRemittance')}</span>
                      <span className="text-charcoal">₹2,820</span>
                    </div>
                    <div className="border-t border-dashed border-gray-100 pt-2 flex justify-between text-xs font-bold tracking-tight text-sage">
                      <span>{t('netPayout')}</span>
                      <span>₹15,680</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Interactive Guidelines Panel */}
        <div className="grid md:grid-cols-2 gap-8 bg-stone rounded-3xl p-6 md:p-8 mb-8 border border-gray-100">
          <div>
            <h4 className="font-bold tracking-tight text-charcoal uppercase tracking-wider text-xs mb-4 flex items-center space-x-2">
              <ClipboardList className="w-4 h-4 text-terracotta" />
              <span>{t('onboardingGuidelines')}</span>
            </h4>
            <p className="text-charcoal-light text-sm font-semibold mb-4 leading-relaxed">
              {t('guidelineText')}
            </p>
            <div className="space-y-3">
              <div className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-sage mt-0.5" />
                <span className="text-xs font-bold text-charcoal-light">{t('guidelineBullet1')}</span>
              </div>
              <div className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-sage mt-0.5" />
                <span className="text-xs font-bold text-charcoal-light">{t('guidelineBullet2')}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold tracking-tight text-charcoal uppercase tracking-wider text-xs mb-4 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-sage" />
              <span>{t('securePayments')}</span>
            </h4>
            <p className="text-charcoal-light text-sm font-semibold mb-4 leading-relaxed">
              {t('paymentsText')}
            </p>
            <ul className="space-y-3 text-xs font-bold text-charcoal-light">
              <li className="flex items-start space-x-2">
                <span className="text-terracotta">•</span>
                <span>{t('paymentsBullet1')}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-terracotta">•</span>
                <span>{t('paymentsBullet2')}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-terracotta">•</span>
                <span>{t('paymentsBullet3')}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA action button inside modal */}
        <div className="flex justify-center mt-4">
          <button
            onClick={() => {
              onClose();
              navigate(user ? '/dashboard' : '/register?role=host');
            }}
            className="btn-premium px-12 py-4 text-base shadow-premium hover:scale-[1.02] active:scale-95 transition-transform duration-300"
          >
            {user ? t('goHostDashboard') : t('startHostingNow')}
          </button>
        </div>

        </div>
      </div>
    </div>
  );
};

const SUGGESTED_DESTINATIONS = [
  { city: "Pune", state: "Maharashtra", desc: "Oxford of the East & Heritage Forts", icon: Hotel },
  { city: "Lonavala", state: "Maharashtra", desc: "Karla Caves & Scenic Valleys", icon: Trees },
  { city: "Mumbai", state: "Maharashtra", desc: "The Financial Hub & Gateway of India", icon: Building2 },
  { city: "North Goa", state: "Goa", desc: "Sandy Beaches & Vibrant Nightlife", icon: Waves },
  { city: "Nashik", state: "Maharashtra", desc: "Wine Capital of India & Temples", icon: Compass },
  { city: "Karjat", state: "Maharashtra", desc: "Waterfalls & Trekking Trails", icon: Home },
  { city: "Mahabaleshwar", state: "Maharashtra", desc: "Strawberry Capital & Hill Station", icon: Sunset },
  { city: "Alibaug", state: "Maharashtra", desc: "Pristine Beaches & Sea Forts", icon: Waves },
  { city: "Igatpuri", state: "Maharashtra", desc: "Foggy Peaks & Waterfalls", icon: Compass }
];

const DESTINATION_CONFIGS = {
  'Nashik': { iconName: 'temple_hindu' },
  'Igatpuri': { iconName: 'waves' },
  'Trimbakeshwar': { iconName: 'temple_hindu' },
  'Bhandardara': { iconName: 'sailing' },
  'Saputara': { iconName: 'tram' },
  'Vaitarna': { iconName: 'water' },
  'Jawhar': { iconName: 'castle' },
  'Wada': { iconName: 'fort' },
  'Lonavala': { iconName: 'landscape' },
  'Mahabaleshwar': { iconName: 'nutrition' },
  'Panchgani': { iconName: 'terrain' },
  'Alibaug': { iconName: 'lighthouse' },
  'Karjat': { iconName: 'hiking' },
  'Pune': { iconName: 'fort' },
  'Mumbai': { iconName: 'location_city' },
  'Goa': { iconName: 'beach_access' }
};

const DESTINATION_SHORTCUTS = [
  'Nashik',
  'Igatpuri',
  'Trimbakeshwar',
  'Bhandardara',
  'Saputara',
  'Vaitarna',
  'Jawhar',
  'Wada',
  'Lonavala',
  'Mahabaleshwar',
  'Panchgani',
  'Alibaug',
  'Karjat',
  'Pune',
  'Mumbai',
  'Goa'
];

const NEARBY_DESTINATION_GROUPS = {
  Nashik: [
    'Nashik',
    'Sula Vineyards',
    'Trimbakeshwar',
    'Igatpuri',
    'Bhandardara',
    'Vaitarna',
    'Saputara',
    'Shirdi',
    'Gangapur Dam',
    'Anjaneri',
    'Harihar Fort',
    'Pandav Leni',
    'Jawhar',
    'Wada',
    'Lonavala',
    'Pune'
  ],
  Mumbai: [
    'Mumbai',
    'Lonavala',
    'Alibaug',
    'Karjat',
    'Wada',
    'Igatpuri',
    'Pune',
    'Nashik',
    'Matheran',
    'Khandala',
    'Vaitarna',
    'Jawhar',
    'Mahabaleshwar',
    'Panchgani',
    'Goa',
    'Bhandardara'
  ],
  Pune: [
    'Pune',
    'Lonavala',
    'Khandala',
    'Panchgani',
    'Mahabaleshwar',
    'Karjat',
    'Alibaug',
    'Mumbai',
    'Nashik',
    'Igatpuri',
    'Bhandardara',
    'Goa',
    'Saputara',
    'Trimbakeshwar',
    'Vaitarna',
    'Wada'
  ],
  Goa: [
    'Goa',
    'North Goa',
    'South Goa',
    'Panjim',
    'Calangute',
    'Baga',
    'Anjuna',
    'Vagator',
    'Candolim',
    'Morjim',
    'Assagao',
    'Arambol',
    'Colva',
    'Palolem',
    'Mumbai',
    'Pune'
  ]
};

const createExploreItem = (label, params) => ({ label, params });

const EXPLORE_MENU_TABS = [
  {
    key: 'villas',
    label: 'Villas',
    columns: [
      [
        createExploreItem('Villas in Nashik', { category: 'residential', property_type: 'villa', city: 'Nashik' }),
        createExploreItem('Villas in Trimbak', { category: 'residential', property_type: 'villa', city: 'Trimbakeshwar' }),
        createExploreItem('Villas in Igatpuri', { category: 'residential', property_type: 'villa', city: 'Igatpuri' }),
        createExploreItem('Villas in Bhandardara', { category: 'residential', property_type: 'villa', city: 'Bhandardara' }),
      ],
      [
        createExploreItem('Luxury Villas in Nashik', { category: 'residential', property_type: 'villa', city: 'Nashik', min_price: '50000' }),
        createExploreItem('Pool Villas in Trimbak', { category: 'residential', property_type: 'villa', city: 'Trimbakeshwar' }),
        createExploreItem('Weekend Villas in Igatpuri', { category: 'residential', property_type: 'villa', city: 'Igatpuri' }),
        createExploreItem('Scenic Villas in Bhandardara', { category: 'residential', property_type: 'villa', city: 'Bhandardara' }),
      ]
    ]
  },
  {
    key: 'homestays',
    label: 'Homestays',
    columns: [
      [
        createExploreItem('Homestays in Nashik', { category: 'residential', city: 'Nashik' }),
        createExploreItem('Apartments in Nashik', { category: 'residential', property_type: 'apartment', city: 'Nashik' }),
        createExploreItem('Farmhouses in Nashik', { category: 'residential', property_type: 'farmhouse', city: 'Nashik' }),
        createExploreItem('Holiday Homes in Igatpuri', { category: 'residential', city: 'Igatpuri' }),
      ],
      [
        createExploreItem('Family Stays in Trimbak', { category: 'residential', city: 'Trimbakeshwar' }),
        createExploreItem('Homestays in Igatpuri', { category: 'residential', city: 'Igatpuri' }),
        createExploreItem('Apartments in Trimbak', { category: 'residential', property_type: 'apartment', city: 'Trimbakeshwar' }),
        createExploreItem('Nature Stays in Bhandardara', { category: 'residential', city: 'Bhandardara' }),
      ]
    ]
  },
  {
    key: 'weddings',
    label: 'Wedding Venues',
    columns: [
      [
        createExploreItem('Wedding Venues in Nashik', { category: 'event_venue', city: 'Nashik' }),
        createExploreItem('Banquet Halls in Nashik', { category: 'event_venue', property_type: 'banquet_hall', city: 'Nashik' }),
        createExploreItem('Corporate Events in Nashik', { category: 'event_venue', city: 'Nashik' }),
        createExploreItem('Celebration Venues in Igatpuri', { category: 'event_venue', city: 'Igatpuri' }),
      ],
      [
        createExploreItem('Resorts & Lawns in Trimbak', { category: 'event_venue', property_type: 'resort', city: 'Trimbakeshwar' }),
        createExploreItem('Wedding Venues in Igatpuri', { category: 'event_venue', city: 'Igatpuri' }),
        createExploreItem('Event Lawns in Nashik', { category: 'event_venue', property_type: 'lawn', city: 'Nashik' }),
        createExploreItem('Resorts in Bhandardara', { category: 'event_venue', property_type: 'resort', city: 'Bhandardara' }),
      ]
    ]
  },
  {
    key: 'workspaces',
    label: 'Workspaces',
    columns: [
      [
        createExploreItem('Workspaces in Nashik', { category: 'commercial', city: 'Nashik' }),
        createExploreItem('Private Offices in Nashik', { category: 'commercial', property_type: 'private_office', city: 'Nashik' }),
        createExploreItem('Team Spaces in Nashik', { category: 'commercial', city: 'Nashik' }),
        createExploreItem('Premium Offices in Nashik', { category: 'commercial', property_type: 'private_office', city: 'Nashik' }),
      ],
      [
        createExploreItem('Office Suites in Trimbak', { category: 'commercial', city: 'Trimbakeshwar' }),
        createExploreItem('Corporate Spaces in Igatpuri', { category: 'commercial', city: 'Igatpuri' }),
        createExploreItem('Co-working in Nashik', { category: 'commercial', property_type: 'co_working', city: 'Nashik' }),
        createExploreItem('Meeting Rooms in Nashik', { category: 'commercial', property_type: 'meeting_room', city: 'Nashik' }),
      ]
    ]
  },
  {
    key: 'places',
    label: 'Places To Visit',
    columns: [
      [
        createExploreItem('Sula Vineyards', { path: '/places/sula-vineyards' }),
        createExploreItem('Trimbakeshwar', { path: '/places/trimbakeshwar' }),
        createExploreItem('Pandav Leni', { path: '/places/pandav-leni' }),
        createExploreItem('Gangapur Dam', { path: '/places/gangapur-dam' }),
      ],
      [
        createExploreItem('Anjaneri', { path: '/places/anjaneri' }),
        createExploreItem('Harihar Fort', { path: '/places/harihar-fort' }),
        createExploreItem('Bhandardara', { path: '/places/bhandardara' }),
        createExploreItem('Igatpuri', { path: '/places/igatpuri' }),
      ]
    ]
  }
];

const DESTINATION_SPOT_CATALOG = [
  { name: 'Pune', hub: 'Pune', latitude: 18.5204, longitude: 73.8567, type: 'city' },
  { name: 'Shaniwar Wada', hub: 'Pune', latitude: 18.5195, longitude: 73.8553, type: 'historical' },
  { name: 'Dagdusheth Ganpati', hub: 'Pune', latitude: 18.5164, longitude: 73.8561, type: 'spiritual' },
  { name: 'Aga Khan Palace', hub: 'Pune', latitude: 18.5525, longitude: 73.9015, type: 'historical' },
  { name: 'Pataleshwar Caves', hub: 'Pune', latitude: 18.5267, longitude: 73.8495, type: 'spiritual' },
  { name: 'Parvati Hill', hub: 'Pune', latitude: 18.5018, longitude: 73.8493, type: 'spiritual' },
  { name: 'Sinhagad Fort', hub: 'Pune', latitude: 18.3663, longitude: 73.7559, type: 'historical' },
  { name: 'Khadakwasla Dam', hub: 'Pune', latitude: 18.4392, longitude: 73.7680, type: 'tourist' },
  { name: 'Alandi', hub: 'Pune', latitude: 18.6777, longitude: 73.8987, type: 'spiritual' },
  { name: 'Dehu', hub: 'Pune', latitude: 18.7185, longitude: 73.7663, type: 'spiritual' },
  { name: 'Jejuri', hub: 'Pune', latitude: 18.2766, longitude: 74.1600, type: 'spiritual' },
  { name: 'Purandar Fort', hub: 'Pune', latitude: 18.2793, longitude: 73.9793, type: 'historical' },
  { name: 'Prati Balaji', hub: 'Pune', latitude: 18.4543, longitude: 73.8535, type: 'spiritual' },
  { name: 'Baneshwar Temple', hub: 'Pune', latitude: 18.3298, longitude: 73.8567, type: 'spiritual' },
  { name: 'Mulshi Dam', hub: 'Pune', latitude: 18.5258, longitude: 73.5130, type: 'tourist' },
  { name: 'Rajmachi Fort', hub: 'Pune', latitude: 18.8266, longitude: 73.3947, type: 'historical' },
  { name: 'Lonavala', hub: 'Pune', latitude: 18.7546, longitude: 73.4062, type: 'tourist' },

  { name: 'Nashik', hub: 'Nashik', latitude: 19.9975, longitude: 73.7898, type: 'city' },
  { name: 'Sula Vineyards', hub: 'Nashik', latitude: 20.0059, longitude: 73.6889, type: 'tourist' },
  { name: 'Trimbakeshwar', hub: 'Nashik', latitude: 19.9323, longitude: 73.5305, type: 'spiritual' },
  { name: 'Pandav Leni', hub: 'Nashik', latitude: 19.9460, longitude: 73.7486, type: 'historical' },
  { name: 'Gangapur Dam', hub: 'Nashik', latitude: 20.0081, longitude: 73.6846, type: 'tourist' },
  { name: 'Anjaneri', hub: 'Nashik', latitude: 19.9176, longitude: 73.5790, type: 'spiritual' },
  { name: 'Igatpuri', hub: 'Nashik', latitude: 19.6952, longitude: 73.5626, type: 'tourist' },
  { name: 'Vaitarna', hub: 'Nashik', latitude: 19.7800, longitude: 73.4720, type: 'tourist' },

  { name: 'Mumbai', hub: 'Mumbai', latitude: 19.0760, longitude: 72.8777, type: 'city' },
  { name: 'Gateway of India', hub: 'Mumbai', latitude: 18.9220, longitude: 72.8347, type: 'historical' },
  { name: 'Siddhivinayak Temple', hub: 'Mumbai', latitude: 19.0169, longitude: 72.8302, type: 'spiritual' },
  { name: 'Elephanta Caves', hub: 'Mumbai', latitude: 18.9633, longitude: 72.9315, type: 'historical' },
  { name: 'Kanheri Caves', hub: 'Mumbai', latitude: 19.2090, longitude: 72.9068, type: 'historical' },
  { name: 'Juhu Beach', hub: 'Mumbai', latitude: 19.0988, longitude: 72.8267, type: 'tourist' },

  { name: 'Goa', hub: 'Goa', latitude: 15.2993, longitude: 74.1240, type: 'city' },
  { name: 'Panjim', hub: 'Goa', latitude: 15.4909, longitude: 73.8278, type: 'tourist' },
  { name: 'Basilica of Bom Jesus', hub: 'Goa', latitude: 15.5009, longitude: 73.9116, type: 'spiritual' },
  { name: 'Fort Aguada', hub: 'Goa', latitude: 15.4922, longitude: 73.7730, type: 'historical' },
  { name: 'Calangute', hub: 'Goa', latitude: 15.5439, longitude: 73.7553, type: 'tourist' },
  { name: 'Baga', hub: 'Goa', latitude: 15.5553, longitude: 73.7517, type: 'tourist' }
];

const DESTINATION_ICON_IMAGE_MAP = {
  'Nashik': '/images/destinations/nashik.png',
  'Sula Vineyards': '/images/destinations/sula-vineyards.png',
  'Gangapur Dam': '/images/destinations/gangapur-dam.png',
  'Anjaneri': '/images/destinations/anjaneri.png',
  'Trimbakeshwar': '/images/destinations/trimbakeshwar.png',
  'Igatpuri': '/images/destinations/igatpuri.png',
  'Harihar Fort': '/images/destinations/harihar-fort.png',
  'Bhandardara': '/images/destinations/bhandardara.png',
  'Lonavala': '/images/destinations/lonavala.png',
  'Karjat': '/images/destinations/karjat.png',
  'Mahabaleshwar': '/images/destinations/mahabaleshwar.png',
  'Goa': '/images/destinations/goa.png',
  'Alibaug': '/images/destinations/alibaug.png',
  'Kokan': '/images/destinations/kokan.png',
  'Pune': '/images/destinations/pune.png',
  'Mumbai': '/images/destinations/mumbai.png',
};

const CURATED_DESTINATION_ROWS = [
  [
    { name: 'Nashik', type: 'tourist' },
    { name: 'Sula Vineyards', type: 'tourist' },
    { name: 'Trimbakeshwar', type: 'spiritual' },
    { name: 'Gangapur Dam', type: 'tourist' },
    { name: 'Igatpuri', type: 'tourist' },
    { name: 'Anjaneri', type: 'tourist' },
    { name: 'Harihar Fort', type: 'historical' },
    { name: 'Bhandardara', type: 'tourist' },
  ],
];

const NEARBY_LOCATION_CENTERS = [
  { city: 'Nashik', latitude: 19.9975, longitude: 73.7898 },
  { city: 'Mumbai', latitude: 19.0760, longitude: 72.8777 },
  { city: 'Pune', latitude: 18.5204, longitude: 73.8567 },
  { city: 'Goa', latitude: 15.2993, longitude: 74.1240 }
];

const toRadians = (value) => (value * Math.PI) / 180;

const getDistanceKm = (from, to) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const findNearestDestinationHub = (coords) => {
  return NEARBY_LOCATION_CENTERS.reduce((nearest, candidate) => {
    const distance = getDistanceKm(coords, candidate);
    return !nearest || distance < nearest.distance ? { ...candidate, distance } : nearest;
  }, null);
};

const normalizeDestinationText = (value = '') => value.trim().toLowerCase();

const findDestinationHubForQuery = (query) => {
  const normalizedQuery = normalizeDestinationText(query);
  if (!normalizedQuery) return null;

  const exactHub = Object.keys(NEARBY_DESTINATION_GROUPS).find(
    (hub) => normalizeDestinationText(hub) === normalizedQuery
  );
  if (exactHub) return exactHub;

  return Object.entries(NEARBY_DESTINATION_GROUPS).find(([, destinations]) =>
    destinations.some((destination) => normalizeDestinationText(destination) === normalizedQuery)
  )?.[0] || null;
};

const getDestinationSpotsForHub = (hub, radiusKm = 50) => {
  const center = NEARBY_LOCATION_CENTERS.find((item) => item.city === hub);
  if (!center) return (NEARBY_DESTINATION_GROUPS[hub] || DESTINATION_SHORTCUTS).map((name) => ({ name }));

  const spots = DESTINATION_SPOT_CATALOG
    .filter((spot) => spot.hub === hub)
    .map((spot) => ({
      ...spot,
      distanceKm: getDistanceKm(center, spot),
    }))
    .filter((spot) => spot.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return spots.length ? spots : (NEARBY_DESTINATION_GROUPS[hub] || DESTINATION_SHORTCUTS).map((name) => ({ name }));
};

const DestinationLineIcon = ({ label, destinationType = 'tourist' }) => {
  const strokeColor = "#232323";
  const blush = "#E8A2B1";
  const sand = "#F4CB98";
  const cream = "#FBF7EF";
  const sizeClass = "h-[70px] w-[70px] md:h-[82px] md:w-[82px]";
  const imageSrc = DESTINATION_ICON_IMAGE_MAP[label];
  const enlargedImageLabels = new Set(['Nashik', 'Sula Vineyards', 'Trimbakeshwar', 'Igatpuri', 'Mumbai']);
  const imageScaleClass = enlargedImageLabels.has(label)
    ? 'scale-[1.24] md:scale-[1.28]'
    : 'scale-100';

  const normalize = (value = '') => value.toLowerCase();

  const resolveVariant = () => {
    const l = normalize(label);
    if (l === 'nashik') return 'grapes';
    if (l === 'pandav leni') return 'caves';
    if (l === 'sula vineyards') return 'wine';
    if (l === 'gangapur dam') return 'dam';
    if (l === 'anjaneri') return 'peak_flag';
    if (l === 'trimbakeshwar') return 'temple_town';
    if (l === 'vaitarna') return 'lake';
    if (l === 'igatpuri') return 'waterfall';
    if (l.includes('vineyard') || l.includes('nashik')) return 'grapes';
    if (l.includes('trimbak') || l.includes('shirdi') || l.includes('temple') || destinationType === 'spiritual') return 'temple';
    if (l.includes('gangapur') || l.includes('vaitarna') || l.includes('dam')) return 'water';
    if (l.includes('igatpuri')) return 'waterfall';
    if (l.includes('pandav') || l.includes('leni')) return 'caves';
    if (l.includes('anjaneri') || l.includes('harihar') || l.includes('trek')) return 'peaks';
    if (l.includes('lonavala') || l.includes('khandala')) return 'hillstation';
    if (l.includes('mahabaleshwar')) return 'strawberry';
    if (l.includes('panchgani')) return 'paraglide';
    if (l.includes('saputara')) return 'sunrise';
    if (l.includes('bhandardara')) return 'lake_mountains';
    if (l.includes('karjat')) return 'forest_camp';
    if (l.includes('goa') || l.includes('calangute') || l.includes('baga') || l.includes('palolem') || l.includes('colva') || l.includes('anjuna') || l.includes('vagator') || l.includes('candolim') || l.includes('morjim')) return 'beach';
    if (l.includes('alibaug')) return 'palm_beach';
    if (l.includes('mumbai')) return 'skyline';
    if (l.includes('pune')) return 'fort';
    if (l.includes('jaipur')) return 'hawa_mahal';
    if (l.includes('udaipur')) return 'palace_lake';
    if (l.includes('panjim')) return 'boat_city';
    if (l.includes('jawhar')) return 'palace';
    if (l.includes('wada')) return 'farmhouse';
    if (l.includes('fort')) return 'fort';
    if (destinationType === 'city') return 'skyline';
    if (destinationType === 'historical') return 'palace';
    return 'landmark';
  };

  const DecorativePillars = () => (
    <>
      <rect x="50" y="8" width="12" height="34" rx="6" fill={sand} />
      <rect x="38" y="8" width="14" height="34" rx="7" fill={blush} />
    </>
  );

  const IconFrame = ({ children }) => (
    <svg viewBox="0 0 72 72" className={sizeClass} fill="none" xmlns="http://www.w3.org/2000/svg">
      <DecorativePillars />
      {children}
    </svg>
  );

  const renderVariant = () => {
    switch (resolveVariant()) {
      case 'grapes':
        return (
          <IconFrame>
            <path d="M27 17C27 17 30 13 34 15" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="23" cy="24" r="4.2" stroke={strokeColor} strokeWidth="1.7" fill={cream} />
            <circle cx="29" cy="24" r="4.2" stroke={strokeColor} strokeWidth="1.7" fill={sand} />
            <circle cx="20" cy="31" r="4.2" stroke={strokeColor} strokeWidth="1.7" fill={sand} />
            <circle cx="26" cy="31" r="4.2" stroke={strokeColor} strokeWidth="1.7" fill={cream} />
            <circle cx="32" cy="31" r="4.2" stroke={strokeColor} strokeWidth="1.7" fill={sand} />
            <circle cx="23" cy="38" r="4.2" stroke={strokeColor} strokeWidth="1.7" fill={cream} />
            <circle cx="29" cy="38" r="4.2" stroke={strokeColor} strokeWidth="1.7" fill={sand} />
          </IconFrame>
        );
      case 'wine':
        return (
          <IconFrame>
            <path d="M21 46V25" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M16 25H26C26 31 23.5 34.5 21 34.5C18.5 34.5 16 31 16 25Z" stroke={strokeColor} strokeWidth="1.7" fill={cream} />
            <path d="M17 46H25" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <rect x="34" y="18" width="10" height="24" rx="2.5" stroke={strokeColor} strokeWidth="1.7" fill={cream} />
            <path d="M39 18V13" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
          </IconFrame>
        );
      case 'dam':
        return (
          <IconFrame>
            <path d="M18 24V44" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M24 26V44" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M30 28V44" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M36 24V44" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M14 46C20 43 26 43 32 46C38 49 44 49 50 46" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M15 20H38" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
          </IconFrame>
        );
      case 'peak_flag':
        return (
          <IconFrame>
            <path d="M13 46L25 23L36 35L48 18L59 46" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M47 18V28" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M47 18H53L50 22L53 26H47" stroke={strokeColor} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M13 46H59" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
          </IconFrame>
        );
      case 'temple_town':
        return (
          <IconFrame>
            <path d="M16 47H47" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M30 17L20 29H40L30 17Z" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" fill={cream} />
            <rect x="23" y="29" width="14" height="18" stroke={strokeColor} strokeWidth="1.7" fill={cream} />
            <path d="M44 24C47 27 49 30 49 34" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="50" cy="18" r="3" stroke={strokeColor} strokeWidth="1.5" fill={cream} />
          </IconFrame>
        );
      case 'lake':
        return (
          <IconFrame>
            <path d="M13 28C19 24 25 24 31 28C37 32 43 32 49 28" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M13 36C19 32 25 32 31 36C37 40 43 40 49 36" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M13 44C19 40 25 40 31 44C37 48 43 48 49 44" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="47" cy="18" r="3.5" fill={sand} />
          </IconFrame>
        );
      case 'temple':
        return (
          <IconFrame>
            <path d="M16 48H46" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M31 16L20 29H42L31 16Z" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" fill={cream} />
            <rect x="24" y="29" width="14" height="19" stroke={strokeColor} strokeWidth="1.7" fill={cream} />
            <path d="M31 16V11" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M31 11H36" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="49" cy="18" r="3.5" fill={sand} />
          </IconFrame>
        );
      case 'mountains':
        return (
          <IconFrame>
            <path d="M12 46L25 22L34 35L45 18L58 46" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M12 46H58" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M45 18L48 15L51 18" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M18 19L21 17" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M22 16L24 15" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          </IconFrame>
        );
      case 'water':
        return (
          <IconFrame>
            <path d="M14 26C20 22 25 22 31 26C37 30 42 30 48 26" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M14 34C20 30 25 30 31 34C37 38 42 38 48 34" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M14 42C20 38 25 38 31 42C37 46 42 46 48 42" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="49" cy="18" r="3.3" fill={sand} />
          </IconFrame>
        );
      case 'hills':
        return (
          <IconFrame>
            <path d="M13 44L25 24L36 36L47 21L59 44" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M14 47C19 44 24 44 29 47C34 50 39 50 44 47C49 44 54 44 58 47" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="48" cy="20" r="3.4" fill={sand} />
          </IconFrame>
        );
      case 'waterfall':
        return (
          <IconFrame>
            <path d="M12 44L24 24L36 36L48 20L58 44" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M46 18V39" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" strokeDasharray="2.5 3" />
            <path d="M14 47C20 44 26 44 32 47C38 50 44 50 50 47" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
          </IconFrame>
        );
      case 'caves':
        return (
          <IconFrame>
            <path d="M12 46L25 22L36 35L48 19L59 46" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M27 46C27 40 30 36.5 34.5 36.5C39 36.5 42 40 42 46" stroke={strokeColor} strokeWidth="1.7" />
            <path d="M12 46H59" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
          </IconFrame>
        );
      case 'peaks':
        return (
          <IconFrame>
            <path d="M13 45L25 23L36 35L48 18L59 45" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M49 18L52 15L55 18" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M13 45H59" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
          </IconFrame>
        );
      case 'hillstation':
        return (
          <IconFrame>
            <path d="M12 45L24 22L35 34L47 19L58 45" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M16 13L18 15" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M20 11L22 13" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="47" cy="21" r="3.6" fill={sand} />
          </IconFrame>
        );
      case 'strawberry':
        return (
          <IconFrame>
            <path d="M29 18C29 15 31 13 34 14" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M31 19C34 20 37 20 39 18" stroke={strokeColor} strokeWidth="1.5" />
            <path d="M24 24C24 17 30 14 35 14C40 14 46 17 46 24C46 34 40 42 35 42C30 42 24 34 24 24Z" stroke={strokeColor} strokeWidth="1.7" fill={cream} />
            <circle cx="31" cy="26" r="1.2" fill={strokeColor} />
            <circle cx="37" cy="28" r="1.2" fill={strokeColor} />
            <circle cx="34" cy="33" r="1.2" fill={strokeColor} />
            <path d="M12 46C19 42 25 42 31 46" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
          </IconFrame>
        );
      case 'paraglide':
        return (
          <IconFrame>
            <path d="M16 45C21 37 27 33 34 33C41 33 47 37 52 45" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M23 23C28 18 33 16 39 16C45 16 49 19 52 23C49 26 45 28 39 29C33 28 28 26 23 23Z" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" fill={cream} />
            <path d="M39 29V40" stroke={strokeColor} strokeWidth="1.5" />
            <circle cx="50" cy="21" r="3" fill={sand} />
          </IconFrame>
        );
      case 'sunrise':
        return (
          <IconFrame>
            <circle cx="33" cy="24" r="7" fill={sand} />
            <path d="M13 40C18 35 24 34 30 38C36 42 42 42 49 37" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M11 46H58" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M21 15L23 18" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M45 15L43 18" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          </IconFrame>
        );
      case 'lake_mountains':
        return (
          <IconFrame>
            <path d="M13 39L24 23L35 34L47 21L58 39" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M14 45C20 42 26 42 32 45C38 48 44 48 50 45" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="49" cy="18" r="3.4" fill={sand} />
          </IconFrame>
        );
      case 'forest_camp':
        return (
          <IconFrame>
            <path d="M18 45L27 28L36 45" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M29 45L39 30L49 45" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M13 47C18 44 24 44 30 47C36 50 42 50 49 47" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M14 21L17 18" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          </IconFrame>
        );
      case 'beach':
        return (
          <IconFrame>
            <path d="M20 19C22 25 21 33 21 41" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M21 22C16 19 12 22 10 25" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M21 21C27 18 32 20 35 24" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M21 27C27 28 30 27 34 24.5" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M10 46C18 43 26 43 36 46" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M31 29L39 33L42 46H26L31 29Z" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" fill={cream} />
            <circle cx="11" cy="18" r="4" fill={cream} stroke={strokeColor} strokeWidth="1.7" />
          </IconFrame>
        );
      case 'palm_beach':
        return (
          <IconFrame>
            <path d="M25 18C27 24 26 33 26 41" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M26 21C21 18 17 21 14 24" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M26 20C32 17 37 19 41 23" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M26 27C32 28 36 26 39 23.5" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M12 46C20 43 30 43 42 46" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="15" cy="16" r="4" fill={cream} stroke={strokeColor} strokeWidth="1.7" />
          </IconFrame>
        );
      case 'skyline':
        return (
          <IconFrame>
            <path d="M14 47H58" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <rect x="18" y="31" width="8" height="16" stroke={strokeColor} strokeWidth="1.7" fill={cream} />
            <rect x="27" y="24" width="10" height="23" stroke={strokeColor} strokeWidth="1.7" fill={cream} />
            <rect x="38" y="28" width="8" height="19" stroke={strokeColor} strokeWidth="1.7" fill={cream} />
            <path d="M32 18C36 18 39 15 39 12" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          </IconFrame>
        );
      case 'hawa_mahal':
        return (
          <IconFrame>
            <path d="M17 47H49" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M21 47V24L28 18L35 24V47" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" fill={cream} />
            <path d="M35 47V25L42 20L49 25V47" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" fill={cream} />
            <circle cx="26" cy="29" r="1.6" fill={strokeColor} />
            <circle cx="31" cy="29" r="1.6" fill={strokeColor} />
            <circle cx="40" cy="30" r="1.6" fill={strokeColor} />
          </IconFrame>
        );
      case 'palace_lake':
        return (
          <IconFrame>
            <path d="M18 39L25 29L32 39L39 25L46 39" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M16 45C21 42 27 42 33 45C39 48 45 48 50 45" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M40 18C43 21 45 24 45 28" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
          </IconFrame>
        );
      case 'boat_city':
        return (
          <IconFrame>
            <path d="M18 42H45L40 47H23L18 42Z" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" fill={cream} />
            <path d="M31 42V22" stroke={strokeColor} strokeWidth="1.7" />
            <path d="M31 24L42 33H31V24Z" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" fill={cream} />
            <path d="M12 50C18 47 24 47 30 50C36 53 42 53 48 50" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
          </IconFrame>
        );
      case 'palace':
        return (
          <IconFrame>
            <path d="M17 47H50" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M20 47V28H27V47" stroke={strokeColor} strokeWidth="1.7" />
            <path d="M40 47V28H47V47" stroke={strokeColor} strokeWidth="1.7" />
            <rect x="27" y="23" width="13" height="24" stroke={strokeColor} strokeWidth="1.7" fill={cream} />
            <path d="M27 23C27 18 30 14 33.5 14C37 14 40 18 40 23" stroke={strokeColor} strokeWidth="1.7" />
          </IconFrame>
        );
      case 'farmhouse':
        return (
          <IconFrame>
            <path d="M17 47V30L29 21L41 30V47" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" fill={cream} />
            <path d="M23 47V36H29V47" stroke={strokeColor} strokeWidth="1.5" />
            <path d="M47 20V47" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M43 29H51" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
          </IconFrame>
        );
      case 'heritage':
        return (
          <IconFrame>
            <path d="M14 47C22 43 30 43 40 47C46 49 51 49 57 46" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M18 45V28L25 22L31 28V45" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" fill={cream} />
            <path d="M31 45V30L38 24L45 30V45" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" fill={cream} />
            <path d="M24 32V45" stroke={strokeColor} strokeWidth="1.5" />
            <path d="M38 34V45" stroke={strokeColor} strokeWidth="1.5" />
            <circle cx="56" cy="16" r="3.2" stroke={strokeColor} strokeWidth="1.5" fill={cream} />
          </IconFrame>
        );
      case 'fort':
        return (
          <IconFrame>
            <path d="M18 46V27H24V46" stroke={strokeColor} strokeWidth="1.7" />
            <path d="M38 46V27H44V46" stroke={strokeColor} strokeWidth="1.7" />
            <rect x="24" y="22" width="14" height="24" stroke={strokeColor} strokeWidth="1.7" fill={cream} />
            <path d="M24 22L31 16L38 22" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M29 33H33V46H29V33Z" stroke={strokeColor} strokeWidth="1.5" />
            <circle cx="49" cy="17" r="3.4" fill={sand} />
          </IconFrame>
        );
      default:
        return (
          <IconFrame>
            <path d="M16 47L28 23L38 36L48 20L58 47" stroke={strokeColor} strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M44 20C46 23 47 26 47 29" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M14 47H58" stroke={strokeColor} strokeWidth="1.7" strokeLinecap="round" />
          </IconFrame>
        );
    }
  };

  if (imageSrc) {
    return (
      <div className="relative flex items-center justify-center h-[94px] w-[94px] md:h-[116px] md:w-[116px] overflow-hidden">
        <img
          src={imageSrc}
          alt={label}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
            const fallback = event.currentTarget.nextSibling;
            if (fallback) fallback.style.display = 'flex';
          }}
          className={`h-full w-full object-contain ${imageScaleClass}`}
        />
        <div className="hidden items-center justify-center">
          {renderVariant()}
        </div>
      </div>
    );
  }

  return <div className="relative flex items-center justify-center">{renderVariant()}</div>;
};

const PREMIUM_COLLECTIONS = [
  {
    id: 'luxury-villas',
    label: 'Luxury Villas & Farmhouses',
    subtitle: 'Private pools, lush lawns & royal stays across India',
    detail: 'From Alibaug to Coorg, our hand-picked villas offer complete privacy, personal caretakers, BBQ setups & breathtaking views. Perfect for family vacations, pre-wedding shoots & weekend escapes.',
    tag: 'Most Booked',
    image: '/videos/Discover our collection/Villas/Bellissimo Villa4 (1).jpg',
    query: 'residential',
    property_type: 'villa,farmhouse'
  },
  {
    id: 'hilltop-retreats',
    label: 'Signature Series',
    subtitle: 'The ultimate pinnacle of private luxury stays',
    detail: 'A curated portfolio of India’s most exclusive private estates, featuring infinity pools, personalized butler service, master chefs, and unparalleled tranquility.',
    tag: 'Signature Series',
    image: '/videos/Discover our collection/Signature series/3baaabd56fa442979578b06924b47477.jpg',
    query: 'residential',
    property_type: 'resort'
  },
  {
    id: 'wedding-venues',
    label: 'Intimate Wedding & Event Venues',
    subtitle: 'Magical backdrops for your dream celebration',
    detail: 'Say goodbye to Big Fat Weddings, say hello to intimate, curated celebration venues with floral-wrapped courtyards, rooftop terraces & in-house chefs. Available for 50 to 300 guests.',
    tag: 'Trending',
    image: '/videos/Discover our collection/Wedding venues/Pegasus Banquet Hall4 (1).jpg',
    query: 'event_venue',
    property_type: ''
  },
  {
    id: 'residential-stays',
    label: 'Premium Apartments & Homes',
    subtitle: 'Fully serviced urban homes with hotel-grade amenities',
    detail: 'Monthly or nightly, our premium residential properties come with AC, WiFi, housekeeping & verified hosts. Ideal for business travelers, relocating professionals & long-term stays in metro cities.',
    tag: 'New Launches',
    image: '/videos/Discover our collection/Residential stay/Vayavia Divine1 (1).jpg',
    query: 'residential',
    property_type: 'not:villa,farmhouse'
  },
  {
    id: 'commercial-spaces',
    label: 'Commercial & Co-working Spaces',
    subtitle: 'Premium offices and collaborative work studios',
    detail: 'Short-term or long-term rentals for startups, corporate offsites, and growing teams. Our commercial spaces include boardrooms, co-working zones, event halls & plug-and-play setups.',
    tag: 'Offices',
    image: '/videos/Discover our collection/office spaces/a69603cfa2714a9baf245d7b43f2cd26.jpg',
    query: 'commercial'
  }
];

const STANDARD_FEATURES = [
  { label: 'Personalised Celebrations', icon: PartyPopper },
  { label: 'Caretaker Onsite', icon: UserCheck },
  { label: 'In-house Chef', icon: ChefHat },
  { label: 'Local Experiences', icon: Compass },
  { label: 'Butler Service', icon: ConciergeBell },
  { label: 'Games & Recreation', icon: Gamepad2 },
  { label: 'Green Open Spaces', icon: Trees }
];

/* ====================================================================
   CollectionsSection — Full-bleed, edge-to-edge, Saffron Stay-inspired
   ==================================================================== */
const CollectionsSection = ({
  navigate,
  properties,
  wishlist,
  handleWishlistToggle,
  getImageUrl
}) => {
  const sliderRef = React.useRef(null);
  const [activeTab, setActiveTab] = React.useState('All');

  const scrollSlider = (direction, id) => {
    const container = document.getElementById(id);
    if (container) {
      container.scrollBy({ left: direction === 'left' ? -350 : 350, behavior: 'smooth' });
    }
  };

  const collectionProperties = React.useMemo(() => {
    return [
      ...(properties?.residential || []),
      ...(properties?.commercial || []),
      ...(properties?.event_venue || []),
    ].filter(Boolean);
  }, [properties]);

  const locationTabs = React.useMemo(() => {
    const preferred = ['Nashik', 'Pune', 'Goa', 'Mumbai', 'Alibaug'];
    const present = preferred.filter((city) =>
      collectionProperties.some((item) => String(item.city || '').trim().toLowerCase() === city.toLowerCase())
    );
    return ['All', ...present, 'Discover All'];
  }, [collectionProperties]);

  const filteredCollections = React.useMemo(() => {
    if (activeTab === 'All') {
      return collectionProperties.slice(0, 8);
    }
    if (activeTab === 'Discover All') {
      return collectionProperties.slice(0, 8);
    }
    return collectionProperties
      .filter((item) => String(item.city || '').trim().toLowerCase() === activeTab.toLowerCase())
      .slice(0, 8);
  }, [activeTab, collectionProperties]);

  const handleCardClick = (col) => {
    if (!col?.property_id) {
      navigate('/guest/browse');
      return;
    }
    navigate(`/property/${col.property_id}`);
  };

  const scroll = (dir) => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: dir === 'left' ? -360 : 360, behavior: 'smooth' });
    }
  };

  return (
    <section className="relative w-full overflow-hidden bg-white py-12 md:py-20">
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{
          background:
            'radial-gradient(circle at 10% 10%, rgba(219,39,119,0.14), transparent 34%), radial-gradient(circle at 88% 12%, rgba(251,191,36,0.18), transparent 28%), radial-gradient(circle at 14% 88%, rgba(249,115,22,0.15), transparent 32%), radial-gradient(circle at 86% 86%, rgba(219,39,119,0.12), transparent 26%), linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.94) 46%, rgba(254,250,246,0.98) 100%)'
        }}
      />
      
      {/* Floating background Rakhi shapes */}
      <style>{`
        @keyframes float-rakhi-1 {
          0% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(30px, -45px) rotate(180deg); }
          100% { transform: translate(0, 0) rotate(360deg); }
        }
        @keyframes float-rakhi-2 {
          0% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(-45px, -30px) rotate(-180deg); }
          100% { transform: translate(0, 0) rotate(-360deg); }
        }
        @keyframes float-rakhi-3 {
          0% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(25px, 35px) rotate(120deg); }
          100% { transform: translate(0, 0) rotate(360deg); }
        }
        .animate-float-1 { animation: float-rakhi-1 25s infinite ease-in-out; }
        .animate-float-2 { animation: float-rakhi-2 30s infinite ease-in-out; }
        .animate-float-3 { animation: float-rakhi-3 28s infinite ease-in-out; }
      `}</style>
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 opacity-[0.09] blur-[0.5px]">
        {/* Floating Rakhi 1 */}
        <div className="absolute top-[8%] left-[3%] w-52 h-52 animate-float-1 text-pink-600">
          <svg className="w-full h-full fill-current" viewBox="0 0 100 100">
            <defs>
              <radialGradient id="gemGrad1" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#FFA07A" />
                <stop offset="40%" stopColor="#DC2626" />
                <stop offset="100%" stopColor="#7F1D1D" />
              </radialGradient>
              <radialGradient id="goldGrad1" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="70%" stopColor="#D4AF37" />
                <stop offset="100%" stopColor="#92400E" />
              </radialGradient>
            </defs>
            {/* Diagonal thread (Dora) */}
            <line x1="5" y1="95" x2="95" y2="5" stroke="#DC2626" strokeWidth="2.5" />
            <line x1="5" y1="95" x2="95" y2="5" stroke="#F59E0B" strokeWidth="1" strokeDasharray="3,2" />
            
            {/* Thread Beads (diagonal) */}
            <circle cx="34" cy="66" r="3.2" fill="#7F1D1D" stroke="#D4AF37" strokeWidth="0.5" />
            <circle cx="26" cy="74" r="3" fill="#FEF3C7" stroke="#D4AF37" strokeWidth="0.5" />
            <circle cx="66" cy="34" r="3.2" fill="#7F1D1D" stroke="#D4AF37" strokeWidth="0.5" />
            <circle cx="74" cy="26" r="3" fill="#FEF3C7" stroke="#D4AF37" strokeWidth="0.5" />

            {/* Central Scalloped Base */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, idx) => (
              <g key={idx} transform={`rotate(${angle} 50 50)`}>
                <circle cx="50" cy="34" r="6" fill="#D4AF37" />
                <circle cx="50" cy="34" r="4.5" fill="#7F1D1D" />
              </g>
            ))}
            
            {/* Concentric layered rings */}
            <circle cx="50" cy="50" r="19" fill="url(#goldGrad1)" stroke="#8B0000" strokeWidth="0.8" />
            <circle cx="50" cy="50" r="16" fill="#7F1D1D" />
            
            {/* Pearls inside circle */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, idx) => (
              <circle key={idx} cx="50" cy="37" r="1.5" fill="#FFFFFF" transform={`rotate(${angle} 50 50)`} />
            ))}

            {/* Inner Star */}
            <polygon points="50,38 53,46 62,46 55,51 58,59 50,54 42,59 45,51 38,46 47,46" fill="url(#goldGrad1)" stroke="#B45309" strokeWidth="0.5" />
            
            {/* Center Gemstone */}
            <circle cx="50" cy="50" r="7" fill="url(#gemGrad1)" stroke="#FFFFFF" strokeWidth="0.5" />
          </svg>
        </div>

        {/* Floating Rakhi 2 */}
        <div className="absolute top-[40%] right-[5%] w-60 h-60 animate-float-2 text-amber-500">
          <svg className="w-full h-full fill-current" viewBox="0 0 100 100">
            {/* Diagonal thread (Dora) */}
            <line x1="5" y1="5" x2="95" y2="95" stroke="#B91C1C" strokeWidth="2.5" />
            <line x1="5" y1="5" x2="95" y2="95" stroke="#FBBF24" strokeWidth="1" strokeDasharray="3,2" />
            
            {/* Thread Beads (diagonal) */}
            <circle cx="34" cy="34" r="3.2" fill="#7F1D1D" stroke="#D4AF37" strokeWidth="0.5" />
            <circle cx="26" cy="26" r="3" fill="#FEF3C7" stroke="#D4AF37" strokeWidth="0.5" />
            <circle cx="66" cy="66" r="3.2" fill="#7F1D1D" stroke="#D4AF37" strokeWidth="0.5" />
            <circle cx="74" cy="74" r="3" fill="#FEF3C7" stroke="#D4AF37" strokeWidth="0.5" />

            {/* Central Scalloped Base */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, idx) => (
              <g key={idx} transform={`rotate(${angle} 50 50)`}>
                <circle cx="50" cy="34" r="6" fill="#D4AF37" />
                <circle cx="50" cy="34" r="4.5" fill="#7F1D1D" />
              </g>
            ))}
            
            {/* Concentric layered rings */}
            <circle cx="50" cy="50" r="19" fill="url(#goldGrad1)" stroke="#8B0000" strokeWidth="0.8" />
            <circle cx="50" cy="50" r="16" fill="#7F1D1D" />
            
            {/* Pearls inside circle */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, idx) => (
              <circle key={idx} cx="50" cy="37" r="1.5" fill="#FFFFFF" transform={`rotate(${angle} 50 50)`} />
            ))}

            {/* Inner Star */}
            <polygon points="50,38 53,46 62,46 55,51 58,59 50,54 42,59 45,51 38,46 47,46" fill="url(#goldGrad1)" stroke="#B45309" strokeWidth="0.5" />
            
            {/* Center Gemstone */}
            <circle cx="50" cy="50" r="7" fill="url(#gemGrad1)" stroke="#FFFFFF" strokeWidth="0.5" />
          </svg>
        </div>

        {/* Floating Rakhi 3 */}
        <div className="absolute bottom-[8%] left-[15%] w-56 h-56 animate-float-3 text-red-500">
          <svg className="w-full h-full fill-current" viewBox="0 0 100 100">
            {/* Diagonal thread (Dora) */}
            <line x1="5" y1="95" x2="95" y2="5" stroke="#DC2626" strokeWidth="2.5" />
            <line x1="5" y1="95" x2="95" y2="5" stroke="#F59E0B" strokeWidth="1" strokeDasharray="3,2" />
            
            {/* Thread Beads (diagonal) */}
            <circle cx="34" cy="66" r="3.2" fill="#7F1D1D" stroke="#D4AF37" strokeWidth="0.5" />
            <circle cx="26" cy="74" r="3" fill="#FEF3C7" stroke="#D4AF37" strokeWidth="0.5" />
            <circle cx="66" cy="34" r="3.2" fill="#7F1D1D" stroke="#D4AF37" strokeWidth="0.5" />
            <circle cx="74" cy="26" r="3" fill="#FEF3C7" stroke="#D4AF37" strokeWidth="0.5" />

            {/* Central Scalloped Base */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, idx) => (
              <g key={idx} transform={`rotate(${angle} 50 50)`}>
                <circle cx="50" cy="34" r="6" fill="#D4AF37" />
                <circle cx="50" cy="34" r="4.5" fill="#7F1D1D" />
              </g>
            ))}
            
            {/* Concentric layered rings */}
            <circle cx="50" cy="50" r="19" fill="url(#goldGrad1)" stroke="#8B0000" strokeWidth="0.8" />
            <circle cx="50" cy="50" r="16" fill="#7F1D1D" />
            
            {/* Pearls inside circle */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, idx) => (
              <circle key={idx} cx="50" cy="37" r="1.5" fill="#FFFFFF" transform={`rotate(${angle} 50 50)`} />
            ))}

            {/* Inner Star */}
            <polygon points="50,38 53,46 62,46 55,51 58,59 50,54 42,59 45,51 38,46 47,46" fill="url(#goldGrad1)" stroke="#B45309" strokeWidth="0.5" />
            
            {/* Center Gemstone */}
            <circle cx="50" cy="50" r="7" fill="url(#gemGrad1)" stroke="#FFFFFF" strokeWidth="0.5" />
          </svg>
        </div>
      </div>
      <div className="relative w-full max-w-[1440px] mx-auto px-4 md:px-8 z-10">
        <ScrollReveal duration="duration-[800ms]">
          <div className="mb-14">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 className="font-serif-hero text-[20px] md:text-[28px] font-semibold text-[#1E1E1E]">
                Discover Our Collection
              </h2>
              <div className="hidden items-center gap-3 text-charcoal md:flex">
                <button
                  onClick={() => scroll('left')}
                  className="rounded-full border border-gray-200 bg-white/90 p-2 backdrop-blur transition-all duration-300 hover:bg-gray-50"
                  aria-label="Previous collection"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => scroll('right')}
                  className="rounded-full border border-gray-200 bg-white/90 p-2 backdrop-blur transition-all duration-300 hover:bg-gray-50"
                  aria-label="Next collection"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-hidden">
              <div
                ref={sliderRef}
                className="flex snap-x gap-5 overflow-x-auto pb-4 scroll-smooth no-scrollbar"
              >
                {PREMIUM_COLLECTIONS.map((col) => (
                  <div
                    key={col.id}
                    onClick={() => {
                      if (col.id === 'hilltop-retreats') {
                        navigate('/guest/browse?signature=true');
                        return;
                      }
                      const typeQuery = col.property_type ? `&property_type=${col.property_type}` : '';
                      navigate(`/guest/browse?category=${col.query}${typeQuery}`);
                    }}
                    className="relative aspect-[3/4] w-[240px] min-w-[240px] snap-start cursor-pointer overflow-hidden rounded-2xl shadow-md transition-all duration-500 hover:shadow-xl md:w-[300px] md:min-w-[300px] group"
                  >
                    <img
                      src={col.image}
                      alt={col.label}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 group-hover:opacity-90" />
                    <div className="absolute left-4 top-4 z-10">
                      {col.tag === 'Signature Series' ? (
                        <div className="flex items-center gap-1.5 border border-[#D4AF37]/50 bg-black px-3 py-1 shadow-md">
                          <Crown className="h-3 w-3 fill-[#D4AF37]/20 text-[#D4AF37]" />
                          <span className="font-serif text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#D4AF37]">
                            Signature Series
                          </span>
                        </div>
                      ) : (
                        <span className="rounded-full bg-white/95 px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest text-charcoal shadow-sm">
                          {col.tag}
                        </span>
                      )}
                    </div>
                    <div className="absolute inset-0 z-10 flex flex-col justify-end p-5 md:p-6">
                      <h3 className="text-lg font-serif-hero leading-snug text-white transition-transform duration-500 group-hover:-translate-y-1 md:text-xl">
                        {col.label}
                      </h3>
                      <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-500 ease-in-out group-hover:mt-2 group-hover:max-h-[120px] group-hover:opacity-100">
                        <p className="text-[11px] leading-relaxed text-white/80 md:text-xs">
                          {col.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal duration="duration-[1000ms]" delay={120}>
          <div>
            <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="font-serif-hero text-[20px] md:text-[28px] font-semibold text-[#1E1E1E]">
                  Holiday Getaway
                </h3>
                <div className="mt-4 flex flex-wrap items-center gap-5 border-b border-black/10 pb-2 text-sm font-medium text-slate-500">
                  {locationTabs.map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          if (tab === 'Discover All') {
                            navigate('/guest/browse');
                            return;
                          }
                          setActiveTab(tab);
                        }}
                        className={`relative pb-2 transition-colors ${
                          isActive ? 'text-charcoal' : 'hover:text-charcoal'
                        }`}
                      >
                        {tab}
                        {isActive ? (
                          <span className="absolute inset-x-0 -bottom-[9px] h-[2px] rounded-full bg-charcoal" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Arrows */}
              <div className="hidden md:flex space-x-2 pb-2">
                <button onClick={() => scrollSlider('left', 'slider-getaway')} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition text-gray-500 hover:text-charcoal cursor-pointer shadow-sm bg-white">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => scrollSlider('right', 'slider-getaway')} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition text-gray-500 hover:text-charcoal cursor-pointer shadow-sm bg-white">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-hidden">
            <div
              id="slider-getaway"
              className="flex snap-x gap-5 overflow-x-auto pb-5 scroll-smooth no-scrollbar"
            >
              {filteredCollections.map((item, index) => {
                const price = Math.round(Number(
                  item.display_price_per_night ??
                  item.customer_price_per_night ??
                  item.price_per_night ??
                  item.price ??
                  0
                ));
                return (
                  <article
                    key={item.property_id || `${item.title}-${index}`}
                    className="group flex w-[280px] min-w-[280px] snap-start flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(15,23,42,0.10)] md:w-[320px] md:min-w-[320px]"
                  >
                    <button
                      type="button"
                      onClick={() => handleCardClick(item)}
                      className="flex h-full flex-col text-left"
                    >
                      <div className="relative aspect-[1.14] overflow-hidden">
                        <img
                          src={getPropertyCardImage(item)}
                          alt={item.title}
                          loading="lazy"
                          decoding="async"
                          onError={({ currentTarget }) => {
                            currentTarget.onerror = null;
                            currentTarget.src = PROPERTY_IMAGE_FALLBACK;
                          }}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        />

                        <div className="absolute right-4 top-4 z-10 flex space-x-2">
                          <ShareDropdown property={item} align="right" className="!w-10 !h-10" />
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleWishlistToggle(item.property_id);
                            }}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-sm backdrop-blur text-charcoal hover:text-red-500"
                            aria-label="Toggle wishlist"
                          >
                            <Heart className={`h-5 w-5 ${wishlist.includes(item.property_id) ? 'fill-red-500 text-red-500' : ''}`} />
                          </button>
                        </div>
                        <div className="absolute bottom-4 right-0 z-10 rounded-l-xl bg-[#171717] px-3 py-2 text-xs font-semibold text-white shadow-lg">
                          Best Rated
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <h3 className="line-clamp-1 text-[1.55rem] font-semibold leading-tight text-charcoal md:text-[1.65rem]">
                          {item.title}
                        </h3>
                        <p className="mt-3 flex items-center gap-1 text-sm font-medium text-slate-600">
                          <MapPin className="h-4 w-4 text-slate-500" />
                          <span>{item.city || 'Maharashtra'}{item.state ? `, ${item.state}` : ''}</span>
                        </p>
                        <p className="mt-3 text-sm text-slate-600">
                          Upto {item.max_guests || item.guests || 4} Guests
                          <span className="mx-2 text-slate-300">✦</span>
                          {item.bedrooms || item.rooms || 1} Rooms
                          <span className="mx-2 text-slate-300">✦</span>
                          {item.bathrooms || item.baths || 1} Baths
                        </p>
                        <div className="mt-4 border-t border-slate-100 pt-4">
                          <div className="flex items-end justify-between gap-3">
                            <div>
                              <p className="text-3xl font-bold tracking-tight text-charcoal">
                                ₹{price.toLocaleString('en-IN')}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">For Per Night + Taxes</p>
                            </div>
                            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-charcoal transition-transform duration-300 group-hover:translate-x-1">
                              <ArrowRight className="h-5 w-5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const exploreMenuCloseTimerRef = React.useRef(null);
  const RECENT_LOCATION_STORAGE_KEY = 'xspace_recent_location_searches';
  const handleSignOut = () => {
    logout();
    navigate('/');
  };
  const [locationQuery, setLocationQuery] = useState('');
  const [recentLocationSearches, setRecentLocationSearches] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('xspace_recent_location_searches') || '[]');
      return Array.isArray(stored) ? stored.slice(0, 5) : [];
    } catch (error) {
      return [];
    }
  });
  const [searchCategory, setSearchCategory] = useState('residential');
  const [nearbyHub, setNearbyHub] = useState('Nashik');
  const [isDetectingNearby, setIsDetectingNearby] = useState(false);

  const [activeDropdown, setActiveDropdown] = useState(null);
  const [guestCounts, setGuestCounts] = useState({ adults: 2, children: 0, infants: 0 });
  const [dates, setDates] = useState({ checkIn: '', checkOut: '' });
  const [landingCalendarOpen, setLandingCalendarOpen] = useState(false);
  const [landingCalendarAnchor, setLandingCalendarAnchor] = useState('checkIn');
  const todayISO = React.useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);
  const [activeCategory, setActiveCategory] = useState('residential');
  const [properties, setProperties] = useState({
    residential: [],
    commercial: [],
    event_venue: []
  });
  const [signatureProperties, setSignatureProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);

  const [footerPopup, setFooterPopup] = useState(null);
  const [cmsContent, setCmsContent] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [activeVideo, setActiveVideo] = useState(0);
  const [prevVideo, setPrevVideo] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [activeBlog, setActiveBlog] = useState(0);
  const [sliderInteracted, setSliderInteracted] = useState({});
  const [recentlyVisitedProperties, setRecentlyVisitedProperties] = useState(() => getRecentlyVisitedProperties());
  const [isNavScrolled, setIsNavScrolled] = useState(false);
  const [isExploreMenuOpen, setIsExploreMenuOpen] = useState(false);
  const [activeExploreTab, setActiveExploreTab] = useState(EXPLORE_MENU_TABS[0]?.key || 'villas');
  const [isMobileExploreOpen, setIsMobileExploreOpen] = useState(false);

  const scrollToSlide = (containerId, index) => {
    const container = document.getElementById(containerId);
    if (container && container.children[index]) {
      const child = container.children[index];
      const leftOffset = child.offsetLeft - container.offsetLeft - (window.innerWidth < 768 ? 16 : 32);
      container.scrollTo({ left: leftOffset, behavior: 'smooth' });
    }
  };

  const activeExploreMenu = EXPLORE_MENU_TABS.find((tab) => tab.key === activeExploreTab) || EXPLORE_MENU_TABS[0];
  const activeMobileExploreMenu = EXPLORE_MENU_TABS.find((tab) => tab.key === activeExploreTab) || EXPLORE_MENU_TABS[0];

  const handleExploreNavigate = (params) => {
    if (params && params.path) {
      navigate(params.path);
      setIsExploreMenuOpen(false);
      return;
    }
    const searchParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value) searchParams.set(key, value);
    });
    navigate(`/guest/browse?${searchParams.toString()}`);
    setIsExploreMenuOpen(false);
  };

  const openExploreMenu = () => {
    if (exploreMenuCloseTimerRef.current) {
      clearTimeout(exploreMenuCloseTimerRef.current);
      exploreMenuCloseTimerRef.current = null;
    }
    setIsExploreMenuOpen(true);
  };

  const closeExploreMenuWithDelay = () => {
    if (exploreMenuCloseTimerRef.current) {
      clearTimeout(exploreMenuCloseTimerRef.current);
    }
    exploreMenuCloseTimerRef.current = setTimeout(() => {
      setIsExploreMenuOpen(false);
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (exploreMenuCloseTimerRef.current) {
        clearTimeout(exploreMenuCloseTimerRef.current);
      }
    };
  }, []);

  const handleSliderScroll = (e, indexSetter) => {
    const container = e.target;
    const children = container.children;
    if (!children || children.length === 0) return;
    
    let closestIndex = 0;
    let minDistance = Infinity;
    const containerLeft = container.scrollLeft + container.offsetLeft;
    
    for (let i = 0; i < children.length; i++) {
      const childLeft = children[i].offsetLeft;
      const distance = Math.abs(childLeft - containerLeft);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    indexSetter(closestIndex);
  };

  const heroSlides = React.useMemo(() => {
    return DEFAULT_HERO_SLIDES;
  }, []);

  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
  const [loadedHeroSlides, setLoadedHeroSlides] = useState(() => new Set([0]));

  React.useEffect(() => {
    setCurrentHeroSlide(0);
    setLoadedHeroSlides(new Set([0]));
  }, [heroSlides]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  React.useEffect(() => {
    const nextIndex = (currentHeroSlide + 1) % heroSlides.length;
    if (loadedHeroSlides.has(nextIndex)) return undefined;

    let image;
    const timer = window.setTimeout(() => {
      image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        setLoadedHeroSlides((loaded) => {
          const nextLoaded = new Set(loaded);
          nextLoaded.add(nextIndex);
          return nextLoaded;
        });
      };
      image.src = heroSlides[nextIndex].src;
    }, currentHeroSlide === 0 ? 1200 : 0);

    return () => {
      window.clearTimeout(timer);
      if (image) image.onload = null;
    };
  }, [currentHeroSlide, loadedHeroSlides, heroSlides]);

  const [lang, setLang] = useState(localStorage.getItem('preferredLanguage') || 'en');
  const [currentPromoSlide, setCurrentPromoSlide] = useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPromoSlide((prev) => (prev === 0 ? 1 : 0));
    }, 5500);
    return () => clearInterval(timer);
  }, []);

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

  const handleWishlistToggle = (propertyId) => {
    if (!user) {
      sessionStorage.setItem('pending_wishlist_property', propertyId);
      navigate('/login');
      return;
    }
    setWishlist(prev => {
      let updated;
      if (prev.includes(propertyId)) {
        updated = prev.filter(id => id !== propertyId);
      } else {
        updated = [...prev, propertyId];
      }
      localStorage.setItem('guest_wishlist', JSON.stringify(updated));
      return updated;
    });
  };

  const handleShareWhatsApp = (property) => {
    const url = `${window.location.origin}/property/${property.property_id}`;
    const text = `Check out this amazing property *${property.title}* in *${property.city}* on X-Space360:\n${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const t = (key) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en']?.[key] || key;
  };
  const footerData = { ...DEFAULT_FOOTER_DATA, ...(cmsContent?.footer || {}) };
  const legalData = { ...footerData, ...(cmsContent?.legal_terms || {}) };
  
  const expectedFooterHeadings = ['For Guests', 'For Hosts', 'Company', 'Support'];
  const cmsFooterSections = Array.isArray(footerData.footer_sections)
    ? footerData.footer_sections.filter(Boolean)
    : [];
  const hasCompleteFooterStructure = expectedFooterHeadings.every((heading) =>
    cmsFooterSections.some(
      (section) => section?.heading?.trim().toLowerCase() === heading.toLowerCase()
    )
  );
  const rawSections = hasCompleteFooterStructure
    ? cmsFooterSections
    : DEFAULT_FOOTER_DATA.footer_sections;

  const footerSections = expectedFooterHeadings.map((heading, index) => {
    const rawSection = rawSections.find(section => section?.heading?.toLowerCase() === heading.toLowerCase())
      || DEFAULT_FOOTER_DATA.footer_sections[index];
    const section = rawSection || {};
    return {
      ...section,
      heading: (!section.heading || /^Section\s+\d+$/i.test(section.heading))
        ? expectedFooterHeadings[index] || `Section ${index + 1}`
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
  ];
  const defaultLandingBlogPosts = [
    {
      id: 'p1',
      title: 'Guide to hotel rewards programmes, deals and booking strategies',
      excerpt: 'How shifting preferences and hybrid work models are driving growth in STR spaces.',
      date: '20 April 2026',
      author: 'Skyscanner',
      img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800',
      read_time: '6 min read'
    },
    {
      id: 'p2',
      title: 'Guide to hotel room types, amenities & policies',
      excerpt: 'Curate your space to appeal to high-end travelers with styling and amenity upgrades.',
      date: '20 April 2026',
      author: 'Skyscanner',
      img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=800',
      read_time: '5 min read'
    },
    {
      id: 'p3',
      title: 'The Smarter Summer Report Your guide to smarter summer planning',
      excerpt: 'Explore the most beautiful villa retreats and holiday home collections for your next vacation.',
      date: '27 April 2026',
      author: 'Skyscanner',
      img: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=800',
      read_time: '7 min read'
    },
    {
      id: 'p4',
      title: 'Are Indian cricket fans the best cricket fans in the world?',
      excerpt: 'Exploring the vibrant passion, energy, and dedication of cricket fans across India.',
      date: '16 October 2023',
      author: 'Noelia Guinon',
      img: 'https://images.unsplash.com/photo-1531415080290-bc98528c165a?auto=format&fit=crop&q=80&w=800',
      read_time: '5 min read'
    }
  ];
  const cmsLandingBlogPosts = Array.isArray(cmsContent?.blog?.posts)
    ? cmsContent.blog.posts
        .filter(post => post?.is_active !== false)
        .slice(0, 4)
        .map(post => ({
          id: post.id,
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          date: post.date,
          author: post.author,
          img: post.image_url || post.img || '',
          read_time: post.read_time || '5 min read'
        }))
    : [];
  const landingBlogPosts = cmsContent?.blog ? cmsLandingBlogPosts : defaultLandingBlogPosts;
  const footerDisplaySections = footerSections;
  const handleFooterLink = (url, fallbackUrl = '/') => {
    const target = url || fallbackUrl;
    if (target.startsWith('#')) {
      const el = document.querySelector(target);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    navigate(target);
  };

  const handleListSpaceClick = () => {
    navigate(user ? (footerData.host_link_1_url || '/host/list-property') : '/register?role=host');
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

  React.useEffect(() => {
    const footerTarget = new URLSearchParams(window.location.search).get('footer');
    if (footerTarget !== 'safety-privacy') return;

    const safetyItem = footerDisplaySections
      .flatMap(section => section.items || [])
      .find(item => /^safety\s*&\s*privacy$/i.test(item.label || ''));

    if (safetyItem) {
      setFooterPopup({
        title: safetyItem.label,
        text: safetyItem.text || 'Safety and privacy details will be updated soon.',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmsContent]);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsNavScrolled(window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  React.useEffect(() => {
    const refreshRecentlyVisited = () => {
      setRecentlyVisitedProperties(getRecentlyVisitedProperties());
    };

    refreshRecentlyVisited();
    window.addEventListener('storage', refreshRecentlyVisited);
    window.addEventListener(RECENTLY_VISITED_PROPERTIES_EVENT, refreshRecentlyVisited);

    return () => {
      window.removeEventListener('storage', refreshRecentlyVisited);
      window.removeEventListener(RECENTLY_VISITED_PROPERTIES_EVENT, refreshRecentlyVisited);
    };
  }, []);

  React.useEffect(() => {
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

  React.useEffect(() => {
    const fetchAllFeatured = async () => {
      setLoading(true);
      try {
        const cacheBust = Date.now();
        const [resRes, resComm, resEvent, resSig] = await Promise.all([
          propertyAPI.searchProperties({ category: 'residential', limit: 10, _t: cacheBust }),
          propertyAPI.searchProperties({ category: 'commercial', limit: 10, _t: cacheBust }),
          propertyAPI.searchProperties({ category: 'event_venue', limit: 10, _t: cacheBust }),
          propertyAPI.searchProperties({ property_type: 'villa', min_price: 50000, limit: 10, _t: cacheBust })
        ]);

        setProperties({
          residential: resRes.data.properties || [],
          commercial: resComm.data.properties || [],
          event_venue: resEvent.data.properties || []
        });
        setSignatureProperties(resSig.data.properties || []);
      } catch (err) {
        console.error("Failed to fetch featured properties:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllFeatured();
  }, []);

  const handleSearch = () => {
    const totalGuests = guestCounts.adults + guestCounts.children;
    const params = new URLSearchParams();
    if (locationQuery.trim()) {
      params.set('search', locationQuery.trim());
      setRecentLocationSearches((current) => {
        const next = [locationQuery.trim(), ...current.filter((item) => item !== locationQuery.trim())].slice(0, 5);
        localStorage.setItem(RECENT_LOCATION_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }
    if (totalGuests) params.set('guests', String(totalGuests));
    if (dates.checkIn) params.set('checkIn', dates.checkIn);
    if (dates.checkOut) params.set('checkOut', dates.checkOut);
    if (searchCategory && searchCategory !== 'all') params.set('category', searchCategory);
    navigate(`/guest/browse?${params.toString()}`);
  };

  const nearbyDestinations = React.useMemo(() => {
    return CURATED_DESTINATION_ROWS.flat();
  }, []);

  const openDestinationProperties = (destination) => {
    const destinationName = typeof destination === 'string' ? destination : destination.name;
    const params = new URLSearchParams();
    params.set('city', destinationName);
    if (destination?.latitude && destination?.longitude) {
      params.set('latitude', String(destination.latitude));
      params.set('longitude', String(destination.longitude));
      params.set('radius_km', '3');
    }
    if (searchCategory && searchCategory !== 'all') params.set('category', searchCategory);
    navigate(`/guest/browse?${params.toString()}`);
  };

  const saveRecentLocation = React.useCallback((value) => {
    const cleaned = String(value || '').trim();
    if (!cleaned) return;
    setRecentLocationSearches((current) => {
      const next = [cleaned, ...current.filter((item) => item !== cleaned)].slice(0, 5);
      localStorage.setItem(RECENT_LOCATION_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleShowNearbyLocations = () => {
    const typedHub = findDestinationHubForQuery(locationQuery);
    if (typedHub) {
      setNearbyHub(typedHub);
      setLocationQuery(typedHub);
      saveRecentLocation(typedHub);
      return;
    }

    if (!navigator.geolocation) {
      setNearbyHub('Nashik');
      setLocationQuery('Nashik');
      saveRecentLocation('Nashik');
      return;
    }

    setIsDetectingNearby(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nearest = findNearestDestinationHub({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        const hub = nearest?.city || 'Nashik';
        setNearbyHub(hub);
        setLocationQuery(hub);
        saveRecentLocation(hub);
        setIsDetectingNearby(false);
      },
      () => {
        setNearbyHub('Nashik');
        setLocationQuery('Nashik');
        saveRecentLocation('Nashik');
        setIsDetectingNearby(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  };

  const LOCATIONS = [
    { name: 'Goa', img: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=100' },
    { name: 'Delhi', img: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=100' },
    { name: 'Nainital', img: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=100' },
    { name: 'Gurugram', img: 'https://images.unsplash.com/photo-1616843413587-9e3a37f7bbd8?w=100' },
    { name: 'Bengaluru', img: 'https://images.unsplash.com/photo-1596761303554-17ec789178d5?w=100' },
  ];

  const scrollSlider = (direction, id) => {
    const container = document.getElementById(id);
    if (container) {
      container.scrollBy({ left: direction === 'left' ? -350 : 350, behavior: 'smooth' });
      setSliderInteracted(prev => ({ ...prev, [id]: true }));
    }
  };
  const renderPropertySlider = (sectionId, title, subtitle, IconComponent, categoryKey, items) => {
    const displayItems = items || [];

    return (
      <div className="relative mb-4 md:mb-6 group">
        {/* Header */}
        <div className="flex items-end justify-between mb-6 max-w-[1440px] mx-auto px-4 md:px-8 w-full">
          <div className="text-left">
            <h3 className="font-serif-hero text-[20px] md:text-[28px] font-semibold text-[#1E1E1E]">
              {title}
            </h3>
            <p className="text-gray-550 text-xs md:text-sm font-medium mt-1">{subtitle}</p>
          </div>
          
          {/* Navigation Arrows */}
          <div className="hidden md:flex space-x-2">
            <button onClick={() => scrollSlider('left', sectionId)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition text-gray-500 hover:text-charcoal cursor-pointer shadow-sm">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => scrollSlider('right', sectionId)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition text-gray-500 hover:text-charcoal cursor-pointer shadow-sm">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Slider */}
        <div className="w-full max-w-[1440px] mx-auto relative px-4 md:px-8">
          <div 
            id={sectionId} 
            onScroll={(e) => {
              if (e.target.scrollLeft > 10 && !sliderInteracted[sectionId]) {
                setSliderInteracted(prev => ({ ...prev, [sectionId]: true }));
              }
            }}
            className="flex overflow-x-auto pb-4 gap-6 no-scrollbar snap-x scroll-smooth"
          >
            {displayItems.map((item, index) => (
              <div 
                key={item.property_id || index} 
                onClick={() => navigate(`/property/${item.property_id}`)}
                className="bg-transparent cursor-pointer transition-all duration-300 min-w-[240px] md:min-w-[280px] w-[240px] md:w-[280px] snap-start flex flex-col group/card flex-shrink-0"
              >
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-3">
                  <img 
                    src={getPropertyCardImage(item)}
                    alt={item.title} 
                    loading="lazy"
                    decoding="async"
                    onError={({ currentTarget }) => {
                      currentTarget.onerror = null;
                      currentTarget.src = PROPERTY_IMAGE_FALLBACK;
                    }}
                    className="w-full h-full object-cover group-hover/card:scale-[1.03] transition duration-500" 
                  />
                  
                  {/* Right Actions (Wishlist like Airbnb) */}
                  <div className="absolute top-3 right-3 z-20 flex space-x-2">
                    <ShareDropdown property={item} align="right" />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleWishlistToggle(item.property_id); }}
                      className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center shadow-sm hover:scale-[1.05] transition cursor-pointer text-charcoal hover:text-red-500"
                    >
                      <Heart className={`w-4 h-4 ${wishlist.includes(item.property_id) ? 'text-red-500 fill-red-500' : ''}`} />
                    </button>
                  </div>

                  {/* Left Actions (Badges) */}
                  <div className="absolute top-3 left-3 flex gap-2 z-20">
                     <div className="glass px-3 py-1 rounded-full shadow-sm bg-white/70 backdrop-blur-md">
                        <span className="text-[10px] font-bold tracking-tight uppercase tracking-widest text-charcoal">
                           {formatPropertyTypeLabel(item.property_type || item.type) || 'Stay'}
                        </span>
                     </div>
                  </div>

                  {/* Instant Booking / Rating bottom left */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 z-20">
                  </div>
                </div>

                <div className="flex-1 flex flex-col px-0.5">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h4 className="font-semibold text-sm md:text-base text-charcoal line-clamp-1 group-hover/card:text-terracotta transition-colors">
                      {item.title}
                    </h4>
                    {item.rating > 0 && item.review_count > 0 && (
                      <span className="flex items-center text-xs font-semibold text-charcoal shrink-0">
                        <Star className="w-3.5 h-3.5 text-[#eab308] fill-current mr-1" />
                        {Number(item.rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-550 text-xs font-medium mb-1 truncate" title={`${formatPropertyTypeLabel(item.type || item.property_type)} in ${item.address ? `${item.address}, ` : ''}${item.city}`}>
                    {formatPropertyTypeLabel(item.type || item.property_type) || 'Property'} in {item.address ? `${item.address}, ` : ''}{item.city}
                  </p>
                  
                  <div className="mt-auto flex items-baseline">
                    <span className="font-bold text-sm md:text-base text-charcoal">₹{Math.round(Number(item.display_price_per_night ?? item.customer_price_per_night ?? item.price_per_night ?? item.price ?? 0)).toLocaleString('en-IN')}</span>
                    <span className="text-gray-500 text-[10px] md:text-xs ml-1 font-normal">
                      &nbsp;/ {item.category === 'commercial' || item.category === 'event_venue'
                        ? (item.pricing_cycle === 'hourly' ? 'hour' : item.pricing_cycle === 'weekly' ? 'week' : item.pricing_cycle === 'monthly' ? 'month' : 'day')
                        : 'night'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {/* View All Card */}
            {sliderInteracted[sectionId] && (
              <div 
                onClick={() => navigate(`/guest/browse?category=${categoryKey}`)}
                className="min-w-[160px] md:min-w-[180px] aspect-[4/3] border border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 snap-start group/viewall"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2 group-hover/viewall:scale-105 transition-transform">
                  <ArrowRight className="w-4 h-4 text-charcoal" />
                </div>
                <span className="font-semibold text-charcoal text-xs">View All</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="landing-page-container min-h-screen bg-white font-sans text-[#2A2A2A] overflow-x-hidden selection:bg-terracotta/20">
      <SEO
        title="Book Stays, Workspaces and Event Venues"
        description="Discover and book villas, farmhouses, residential stays, commercial workspaces and event venues across India with X-Space360."
        path="/"
        keywords={[
          "villa booking",
          "farmhouse booking",
          "workspace booking",
          "event venue booking",
          "X-Space360",
        ]}
        type="home"
        schema={homeSchema}
        seo={cmsContent?.seo}
        breadcrumbs={[{ name: "Home", url: "/" }]}
      />
      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 w-full z-50 h-20 md:h-24 transition-all duration-300 ${
          isNavScrolled
            ? 'bg-white/95 text-charcoal shadow-subtle backdrop-blur-xl border-b border-gray-100'
            : 'bg-transparent text-white'
        }`}
      >
        <div className="max-w-[1440px] mx-auto w-full h-full flex justify-between items-center px-4 md:px-8">
          {/* Left Logo */}
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
            <img
              src={isNavScrolled ? "/logo.png" : "/logo-white-text.png"}
              alt="X-Space360 Logo"
              className="h-8 md:h-10 w-auto object-contain transition-all duration-300"
            />
          </div>

          {/* Center Menu Links (Flat Style) */}
          <div className={`hidden lg:flex items-center space-x-8 font-sans font-semibold text-[17px] tracking-tight transition-colors duration-300 ${isNavScrolled ? 'text-charcoal' : 'text-white/90'}`}>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); navigate('/guest/browse'); }}
              className="hover:text-terracotta transition-colors duration-200"
            >
              Discover
            </a>

            <button
              onClick={() => setShowHowItWorksModal(true)}
              className="hover:text-terracotta transition-colors duration-200"
            >
              How It Works
            </button>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); navigate(user ? '/host/list-property' : '/register?role=host'); }}
              className="hover:text-terracotta transition-colors duration-200"
            >
              List your Property
            </a>
            <div
              className="relative"
              onMouseEnter={openExploreMenu}
              onMouseLeave={closeExploreMenuWithDelay}
            >
              <button
                type="button"
                onClick={() => {
                  if (isExploreMenuOpen) {
                    setIsExploreMenuOpen(false);
                  } else {
                    openExploreMenu();
                  }
                }}
                className="hover:text-terracotta transition-colors duration-200 flex items-center gap-1"
              >
                <span>Explore</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExploreMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isExploreMenuOpen && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-4 w-[860px] rounded-[28px] bg-white border border-gray-200 shadow-elevated ring-1 ring-black/5 px-5 py-4 z-[999] text-gray-900"
                  onMouseEnter={openExploreMenu}
                  onMouseLeave={closeExploreMenuWithDelay}
                >
                  <div className="flex items-center gap-8 border-b border-gray-200 px-3 pb-4 overflow-x-auto no-scrollbar">
                    {EXPLORE_MENU_TABS.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onMouseEnter={() => setActiveExploreTab(tab.key)}
                        onClick={() => {
                          openExploreMenu();
                          setActiveExploreTab(tab.key);
                        }}
                        className={`relative whitespace-nowrap text-[15px] font-medium transition-colors duration-200 ${
                          activeExploreTab === tab.key ? 'text-charcoal' : 'text-gray-500 hover:text-charcoal'
                        }`}
                      >
                        {tab.label}
                        {activeExploreTab === tab.key && (
                          <span className="absolute left-0 right-0 -bottom-[17px] h-[2px] bg-charcoal rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-0 pt-4">
                    {activeExploreMenu?.columns?.map((column, columnIndex) => (
                      <div
                        key={`${activeExploreMenu.key}-column-${columnIndex}`}
                        className="px-4 first:pl-2 last:pr-2 border-r border-gray-100 last:border-r-0"
                      >
                        <div className="flex flex-col space-y-3">
                          {column.map((item) => (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => handleExploreNavigate(item.params)}
                              className="text-left text-[15px] text-gray-500 hover:text-charcoal transition-colors duration-200"
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side Options */}
          <div className="hidden lg:flex items-center space-x-6">
            <LanguageSelector showPropertyTypes />

            {/* Get in Touch Button */}
            <button 
              onClick={() => navigate('/support')}
              className={`flex items-center gap-2 rounded-full px-5 py-2.5 transition font-sans font-semibold text-[17px] tracking-tight shadow-sm border ${
                isNavScrolled
                  ? 'border-gray-200 text-charcoal hover:bg-gray-50'
                  : 'border-white/40 text-white hover:bg-white/10'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Get in Touch</span>
            </button>

            {/* User/Profile Button */}
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/dashboard')}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border transition shadow-subtle ${
                    isNavScrolled
                      ? 'bg-gray-50 hover:bg-gray-100 text-charcoal border-gray-200'
                      : 'bg-white/25 hover:bg-white/35 text-white border-white/30'
                  }`}
                  title="Dashboard"
                >
                  <User className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={handleSignOut}
                  className="bg-terracotta hover:bg-terracotta/90 text-white font-sans font-semibold text-[14px] tracking-tight px-5 py-2.5 rounded-full transition shadow-premium"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className={`w-10 h-10 rounded-full flex items-center justify-center border transition shadow-subtle ${
                  isNavScrolled
                    ? 'bg-gray-50 hover:bg-gray-100 text-charcoal border-gray-200'
                    : 'bg-white/25 hover:bg-white/35 text-white border-white/30'
                }`}
                title="Sign In"
              >
                <User className="w-4.5 h-4.5" />
              </button>
            )}
          </div>

          {/* Mobile Hamburger Icon */}
          <div className="lg:hidden flex items-center">
            <button onClick={() => setIsMobileMenuOpen(true)} className={`${isNavScrolled ? 'text-charcoal' : 'text-white'} hover:text-terracotta transition p-2`}>
              <Menu className="w-8 h-8 drop-shadow-subtle" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-[2px] flex lg:hidden animate-fade-in">
          <div className="w-[76px] bg-[#1f1f1f]" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="flex-1 max-w-[calc(100vw-76px)] bg-white min-h-full overflow-y-auto">
            <div className="bg-[#1f1f1f] px-5 pt-5 pb-6 text-white">
              <div className="flex items-start justify-between">
                <div className="space-y-5">
                  <div className="cursor-pointer" onClick={() => { setIsMobileMenuOpen(false); navigate('/'); }}>
                    <img src="/logo.png" alt="X-Space360 Logo" className="h-8 w-auto object-contain logo-white" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-charcoal">
                      <User className="w-6 h-6" />
                    </div>
                    {!user ? (
                      <button
                        onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }}
                        className="border border-white rounded-xl px-4 py-2 text-sm font-semibold"
                      >
                        Login/Sign up
                      </button>
                    ) : (
                      <button
                        onClick={() => { setIsMobileMenuOpen(false); navigate('/dashboard'); }}
                        className="border border-white rounded-xl px-4 py-2 text-sm font-semibold"
                      >
                        Open Dashboard
                      </button>
                    )}
                  </div>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-white/80 hover:text-white transition">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="px-5 py-5 text-charcoal">
              <div className="flex flex-col">
            <button
              onClick={() => { setIsMobileMenuOpen(false); navigate('/guest/browse'); }}
              className="text-left text-[17px] font-medium transition py-4 border-b border-gray-200"
            >
              Discover
            </button>

            <button
              onClick={() => { setIsMobileMenuOpen(false); setShowHowItWorksModal(true); }}
              className="text-left text-[17px] font-medium transition py-4 border-b border-gray-200"
            >
              How It Works
            </button>
            <button
              onClick={() => { setIsMobileMenuOpen(false); navigate(user ? '/host/list-property' : '/register?role=host'); }}
              className="text-left text-[17px] font-medium transition py-4 border-b border-gray-200"
            >
              List your Property
            </button>
            <div className="border-b border-gray-200 py-4">
              <button
                type="button"
                onClick={() => setIsMobileExploreOpen((prev) => !prev)}
                className="w-full text-left text-[17px] font-medium transition flex items-center justify-between"
              >
                <span>Explore</span>
                <ChevronDown className={`w-5 h-5 transition-transform duration-200 text-gray-500 ${isMobileExploreOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMobileExploreOpen && (
                <div className="mt-4 rounded-[20px] bg-[#faf7f2] text-charcoal px-4 py-4 space-y-4 border border-[#eee6d8]">
                  <div className="flex gap-4 overflow-x-auto no-scrollbar border-b border-[#e9dfcf] pb-3">
                    {EXPLORE_MENU_TABS.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveExploreTab(tab.key)}
                        className={`whitespace-nowrap text-base font-semibold transition ${
                          activeExploreTab === tab.key ? 'text-charcoal underline underline-offset-8' : 'text-charcoal-muted'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                    {activeMobileExploreMenu?.columns?.flat().map((item) => (
                      <button
                        key={`${activeMobileExploreMenu.key}-${item.label}`}
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setIsMobileExploreOpen(false);
                          handleExploreNavigate(item.params);
                        }}
                        className="block w-full text-left text-[15px] text-charcoal hover:text-terracotta transition"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => { setIsMobileMenuOpen(false); navigate('/support'); }}
              className="text-left text-[17px] font-medium flex items-center gap-2 py-4 border-b border-gray-200"
            >
              <Phone className="w-4.5 h-4.5" />
              <span>Get in Touch</span>
            </button>
            <div className="py-4 border-b border-gray-200 flex flex-col items-start">
              <LanguageSelector mode="inline" showPropertyTypes />
            </div>

            {user ? (
              <>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); navigate('/dashboard'); }}
                  className="text-left text-[17px] font-medium py-4 border-b border-gray-200"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); handleSignOut(); }}
                  className="mt-6 bg-[#1f1f1f] text-white font-semibold py-4 rounded-xl text-center transition"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }}
                  className="text-left text-[17px] font-medium transition py-4 border-b border-gray-200"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); navigate('/register?role=host'); }}
                  className="mt-6 bg-[#d9b233] hover:bg-[#cda62b] text-white font-semibold py-4 rounded-xl text-center transition"
                >
                  Become a Host
                </button>
              </>
            )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== PREMIUM SLIDING IMAGE HERO ===== */}
      <section className="relative w-full z-30 bg-white px-0 pt-0 pb-0">
      <div className="relative h-[68vh] min-h-[620px] max-h-[700px] md:h-[62vh] md:min-h-[560px] md:max-h-[640px] w-full z-30 overflow-visible bg-white shadow-premium">
        
        {/* ── Sliding/Fading Background Images ── */}
        {heroSlides.map((slide, index) => (
          <div 
            key={index}
            className="absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out z-0"
            style={{
              backgroundImage: index === currentHeroSlide || loadedHeroSlides.has(index)
                ? `url(${slide.src})`
                : 'none',
              backgroundSize: 'cover',
              backgroundPosition: slide.mobilePosition || 'center',
              opacity: index === currentHeroSlide ? 1 : 0
            }}
          />
        ))}

        {/* ── 35% dark overlay ── */}
        <div className="absolute inset-0 bg-black/35 z-10 transition-opacity duration-1000" />

        {/* ── Hero Content (Centered with Spacing & font-lufga) ── */}
        <div className="relative z-20 max-w-6xl mx-auto px-4 md:px-12 h-full flex flex-col justify-center md:justify-end items-center text-center pt-24 md:pt-36 pb-5 md:pb-12">
          {(() => {
            const activeHero = heroSlides[currentHeroSlide] || heroSlides[0] || DEFAULT_HERO_SLIDES[0];
            return (
              <div className="flex flex-col items-center space-y-3 md:space-y-5 w-full mb-0 md:mb-4 -mt-8 md:mt-0">
                 <div className="flex items-center justify-center gap-2 md:gap-4 w-full px-1 animate-fade-in" key={`title-${currentHeroSlide}`}>
                   <button
                     type="button"
                     onClick={() => setCurrentHeroSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
                     className="w-9 h-9 md:w-11 md:h-11 rounded-full border border-white/25 bg-white/10 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/18 transition shrink-0"
                     aria-label="Previous hero slide"
                   >
                     <ChevronLeft className="w-5 h-5" />
                   </button>

                   <h2 className="text-[28px] sm:text-4xl md:text-5xl lg:text-[58px] font-medium leading-[1.08] text-white drop-shadow-premium font-lufga tracking-[-0.03em] max-w-[250px] sm:max-w-none">
                     {activeHero.titlePrefix} {activeHero.titleHighlight} {activeHero.titleSuffix}
                   </h2>

                   <button
                     type="button"
                     onClick={() => setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length)}
                     className="w-9 h-9 md:w-11 md:h-11 rounded-full border border-white/25 bg-white/10 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/18 transition shrink-0"
                     aria-label="Next hero slide"
                   >
                     <ChevronRight className="w-5 h-5" />
                   </button>
                 </div>
                 
                 {/* Custom Badges / Batches instead of Subtitle */}
                 <div className="flex flex-wrap justify-center gap-2 animate-fade-in" key={`badges-${currentHeroSlide}`}>
                   {activeHero.badges && activeHero.badges.map((badge, idx) => (
                     <span key={idx} className="border border-white bg-white/10 backdrop-blur-md rounded-full px-4 md:px-6 py-2 text-white font-bold text-[11px] md:text-sm drop-shadow-sm select-none">
                       {badge}
                     </span>
                   ))}
                 </div>

                 <div className="w-full mt-3 md:mt-6 relative max-w-5xl text-left">
                    {/* Transparent overlay to close active dropdowns on clicking outside */}
                    {activeDropdown && (
                      <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActiveDropdown(null)} />
                    )}

                    {/* Capsule Search Bar */}
                    <div className="relative z-50 overflow-visible rounded-[34px] lg:rounded-[44px] p-[1px]">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-[34px] lg:rounded-[44px] opacity-100"
                        style={{
                          background:
                            'linear-gradient(90deg, rgba(249,115,22,0.24) 0%, rgba(251,191,36,0.16) 12%, rgba(255,255,255,0.94) 28%, rgba(255,255,255,0.98) 50%, rgba(255,255,255,0.94) 72%, rgba(244,63,94,0.14) 88%, rgba(219,39,119,0.2) 100%)',
                        }}
                      />
                      <div className="flex flex-col lg:flex-row items-stretch lg:items-center rounded-[30px] lg:rounded-full w-full shadow-elevated border border-sand-200/80 p-3 lg:p-3 relative overflow-visible bg-white">
                        <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-[30px] lg:rounded-full"
                        style={{
                          background:
                            'linear-gradient(90deg, rgba(249,115,22,0.18) 0%, rgba(254,243,199,0.86) 14%, rgba(255,255,255,0.98) 32%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.98) 68%, rgba(253,244,245,0.86) 86%, rgba(219,39,119,0.15) 100%)',
                        }}
                      />
                        
                        {/* Raksha Bandhan Festive Rakhi Icon */}
                        <div className="flex items-center shrink-0 pl-3 pr-1 text-pink-600 select-none animate-pulse" title="Raksha Bandhan Special">
                          <svg className="w-4 h-2 text-amber-500 fill-current opacity-80" viewBox="0 0 40 10">
                            <path d="M0,5 Q10,0 20,5 T40,5" stroke="currentColor" strokeWidth="2.5" fill="none" />
                          </svg>
                          <div className="relative w-5 h-5 flex items-center justify-center mx-1">
                            <div className="absolute inset-0 rounded-full border border-dashed border-red-500 bg-amber-400 animate-spin" style={{ animationDuration: '10s' }} />
                            <div className="absolute w-3.5 h-3.5 rounded-full bg-red-600 flex items-center justify-center shadow-inner">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                            </div>
                          </div>
                          <svg className="w-4 h-2 text-amber-500 fill-current opacity-80" viewBox="0 0 40 10">
                            <path d="M0,5 Q10,0 20,5 T40,5" stroke="currentColor" strokeWidth="2.5" fill="none" />
                          </svg>
                        </div>
                        
                        {/* Search Input */}
                        <div className="relative flex-1 w-full min-w-0 z-10">
                          <div 
                            onClick={() => {
                              const el = document.getElementById('landing-search-query');
                              if (el) el.focus();
                            }}
                            className="flex items-center px-3 lg:px-6 py-2.5 lg:py-3 w-full cursor-pointer group rounded-2xl lg:rounded-full hover:bg-stone/50 transition duration-200"
                          >
                            <Search className="w-4.5 h-4.5 text-gray-400 mr-3 group-hover:text-terracotta transition-colors shrink-0" />
                            <div className="w-full text-left">
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">Search</p>
                              <input
                                id="landing-search-query"
                                name="search"
                                type="text"
                                value={locationQuery}
                                onChange={(e) => {
                                  setLocationQuery(e.target.value);
                                }}
                                placeholder="Search properties..."
                                className="bg-transparent border-none outline-none text-charcoal w-full placeholder-gray-400 font-extrabold text-sm focus:ring-0 focus:outline-none p-0 mt-1"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="hidden lg:block w-[1px] h-8 bg-gray-200" />
                        
                        <div className={`relative flex flex-row items-stretch lg:items-center shrink-0 w-full lg:w-auto ${landingCalendarOpen ? 'z-[60]' : 'z-[1]'}`}>
                          {/* Check-in */}
                          <div className="relative flex-1 flex items-center px-3 lg:px-6 py-2.5 lg:py-3 hover:bg-stone/50 rounded-2xl lg:rounded-full transition duration-200 group shrink-0">
                            <Calendar className="w-4.5 h-4.5 text-gray-400 mr-2 lg:mr-3 group-hover:text-terracotta transition-colors z-0 shrink-0" />
                            <button
                              type="button"
                              onClick={() => {
                                setLandingCalendarAnchor('checkIn');
                                setLandingCalendarOpen(true);
                              }}
                              className="w-full text-left"
                            >
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">Check-in</p>
                              <p className={`font-extrabold text-xs lg:text-sm mt-1 leading-none ${dates.checkIn ? 'text-charcoal' : 'text-gray-400'}`}>
                                {dates.checkIn || 'Select Date'}
                              </p>
                            </button>
                            {landingCalendarOpen && landingCalendarAnchor === 'checkIn' && (
                              <DateRangePicker
                                open={landingCalendarOpen}
                                anchor={landingCalendarAnchor}
                                checkIn={dates.checkIn}
                                checkOut={dates.checkOut}
                                minDate={todayISO}
                                onChange={setDates}
                                onClose={() => setLandingCalendarOpen(false)}
                              />
                            )}
                          </div>
                          
                          {/* Arrow Separator */}
                          <div className="hidden lg:flex items-center text-gray-300 mx-1 shrink-0">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                          {/* Check-out */}
                          <div className="relative flex-1 flex items-center px-3 lg:px-6 py-2.5 lg:py-3 hover:bg-stone/50 rounded-2xl lg:rounded-full transition duration-200 group shrink-0">
                            <Calendar className="w-4.5 h-4.5 text-gray-400 mr-2 lg:mr-3 group-hover:text-terracotta transition-colors z-0 shrink-0" />
                            <button
                              type="button"
                              onClick={() => {
                                setLandingCalendarAnchor('checkOut');
                                setLandingCalendarOpen(true);
                              }}
                              className="w-full text-left"
                            >
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">Check-out</p>
                              <p className={`font-extrabold text-xs lg:text-sm mt-1 leading-none ${dates.checkOut ? 'text-charcoal' : 'text-gray-400'}`}>
                                {dates.checkOut || 'Select Date'}
                              </p>
                            </button>
                            {landingCalendarOpen && landingCalendarAnchor === 'checkOut' && (
                              <DateRangePicker
                                open={landingCalendarOpen}
                                anchor={landingCalendarAnchor}
                                checkIn={dates.checkIn}
                                checkOut={dates.checkOut}
                                minDate={todayISO}
                                onChange={setDates}
                                onClose={() => setLandingCalendarOpen(false)}
                              />
                            )}
                          </div>
                        </div>
                        <div className="hidden lg:block w-[1px] h-8 bg-gray-200" />

                        {/* Guests */}
                        <div className={`relative flex-1 w-full ${activeDropdown === 'guests' ? 'z-[60]' : 'z-[1]'}`}>
                          <div 
                            onClick={() => setActiveDropdown(activeDropdown === 'guests' ? null : 'guests')}
                            className="flex items-center px-3 lg:px-6 py-2.5 lg:py-3 w-full cursor-pointer hover:bg-stone/50 rounded-2xl lg:rounded-full transition duration-200 group"
                          >
                            <User className="w-4.5 h-4.5 text-gray-400 mr-3 group-hover:text-terracotta transition-colors shrink-0" />
                            <div className="w-full text-left">
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">Guests</p>
                              <p className="text-charcoal font-extrabold text-sm mt-1 leading-none whitespace-nowrap">
                                {guestCounts.adults + guestCounts.children} Guest{(guestCounts.adults + guestCounts.children) > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          
                          {activeDropdown === 'guests' && (
                            <div className="absolute right-0 top-full mt-3 w-72 bg-white border border-gray-100 rounded-3xl shadow-elevated z-50 p-6 space-y-5">
                              {/* Adults Row */}
                              <div className="flex items-center justify-between">
                                <div className="text-left">
                                  <p className="text-sm font-bold text-charcoal">Adults</p>
                                  <p className="text-xs text-gray-400 font-semibold mt-0.5">Age 13 or above</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setGuestCounts({ ...guestCounts, adults: Math.max(1, guestCounts.adults - 1) })}
                                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 active:scale-95 transition text-charcoal font-bold"
                                  >
                                    -
                                  </button>
                                  <span className="w-4 text-center text-sm font-bold text-charcoal">{guestCounts.adults}</span>
                                  <button
                                    type="button"
                                    onClick={() => setGuestCounts({ ...guestCounts, adults: guestCounts.adults + 1 })}
                                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 active:scale-95 transition text-charcoal font-bold"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                              
                              {/* Children Row */}
                              <div className="flex items-center justify-between">
                                <div className="text-left">
                                  <p className="text-sm font-bold text-charcoal">Children</p>
                                  <p className="text-xs text-gray-400 font-semibold mt-0.5">Ages 2–12</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setGuestCounts({ ...guestCounts, children: Math.max(0, guestCounts.children - 1) })}
                                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 active:scale-95 transition text-charcoal font-bold"
                                  >
                                    -
                                  </button>
                                  <span className="w-4 text-center text-sm font-bold text-charcoal">{guestCounts.children}</span>
                                  <button
                                    type="button"
                                    onClick={() => setGuestCounts({ ...guestCounts, children: guestCounts.children + 1 })}
                                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 active:scale-95 transition text-charcoal font-bold"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Search Button */}
                        <div className="w-full lg:w-auto p-1 pt-1.5 lg:pt-1 shrink-0 z-[1]">
                          <button
                            onClick={handleSearch}
                            className="w-full lg:w-auto bg-[#1A1A1A] hover:bg-black text-white font-bold text-xs uppercase tracking-widest px-8 py-3 lg:py-4 rounded-2xl lg:rounded-full transition duration-200 shadow-md cursor-pointer"
                          >
                            SEARCH
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                 </div>
            );
          })()}
        </div>
      </div>
      </section>

      {/* ── Category Shortcut Strip ── */}
      <ScrollReveal duration="duration-[800ms]">
        <div className="w-full bg-white relative z-20 py-8 md:py-12 border-b border-sand-100">
          <div className="max-w-[1440px] mx-auto px-4 md:px-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h2 className="font-serif-hero text-[20px] md:text-[28px] font-semibold text-[#1E1E1E]">Pick a Destination</h2>
              </div>
              <div className="flex md:hidden items-center gap-3 text-charcoal self-end">
                <span className="text-[11px] font-semibold text-charcoal-muted">Swipe</span>
                <ChevronRight className="w-4 h-4" />
              </div>
              <div className="hidden md:flex items-center gap-3 text-charcoal">
                <ChevronLeft className="w-5 h-5" />
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-6 md:space-y-8">
              {CURATED_DESTINATION_ROWS.map((row, rowIndex) => (
                <div
                  key={`destination-row-${rowIndex}`}
                  className="flex overflow-x-auto gap-5 pb-2 no-scrollbar md:grid md:grid-cols-4 lg:grid-cols-8 md:gap-x-5 md:gap-y-6 md:overflow-visible md:pb-0"
                >
                  {row.map((destination) => {
                    const label = destination.name;
                    return (
                      <button
                        key={label}
                        onClick={() => openDestinationProperties(destination)}
                        className="group flex flex-col items-center gap-2 cursor-pointer min-w-[112px] md:min-w-0 shrink-0"
                      >
                        <div className="flex h-[104px] md:h-[124px] items-center justify-center transition-transform duration-300 group-hover:-translate-y-1">
                          <DestinationLineIcon label={label} destinationType={destination.type || 'tourist'} />
                        </div>
                        <p className="max-w-[120px] text-charcoal font-medium text-[12px] md:text-[14px] tracking-tight leading-[1.25] text-center">
                          {label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

          </div>
        </div>
      </ScrollReveal>
      {/* Content Section — full width, overflow guard */}
      <div className="w-full bg-white relative z-20 overflow-x-hidden">

        {recentlyVisitedProperties.length > 0 && (
          <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-8 md:py-12 border-b border-sand-100">
            <div className="flex items-end justify-between gap-4 mb-6">
              <div className="text-left">
                <h2 className="font-serif-hero text-[20px] md:text-[28px] font-semibold text-[#1E1E1E]">Recently Visited</h2>
                <div className="mt-6 inline-flex flex-col items-start">
                  <span className="text-sm md:text-base font-bold text-charcoal">Properties</span>
                  <span className="mt-2 h-[2px] w-full bg-charcoal" />
                </div>
              </div>
              <div className="hidden md:flex items-center gap-3 text-charcoal">
                <button
                  type="button"
                  onClick={() => scrollSlider('left', 'slider-recently-visited')}
                  className="p-1 hover:text-terracotta transition cursor-pointer"
                  aria-label="Previous recently visited properties"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollSlider('right', 'slider-recently-visited')}
                  className="p-1 hover:text-terracotta transition cursor-pointer"
                  aria-label="Next recently visited properties"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div
              id="slider-recently-visited"
              className="flex overflow-x-auto gap-4 md:gap-6 pb-4 no-scrollbar snap-x scroll-smooth"
            >
              {recentlyVisitedProperties.map((item, index) => (
                <button
                  key={item.property_id || index}
                  type="button"
                  onClick={() => navigate(`/property/${item.property_id}`)}
                  className="min-w-[260px] md:min-w-[285px] w-[260px] md:w-[285px] bg-white rounded-xl overflow-hidden border border-gray-100 shadow-subtle hover:shadow-elevated transition text-left snap-start flex-shrink-0"
                >
                  <div className="relative aspect-[16/10] bg-stone overflow-hidden">
                    <img
                      src={getPropertyCardImage(item)}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      onError={({ currentTarget }) => {
                        currentTarget.onerror = null;
                        currentTarget.src = PROPERTY_IMAGE_FALLBACK;
                      }}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 flex gap-2 z-20">
                      {item.rating > 0 && item.review_count > 0 && (
                        <div className="bg-charcoal/70 text-white rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1">
                          <span>{Number(item.rating).toFixed(1)}</span>
                          <Star className="w-3.5 h-3.5 text-[#E0A51B] fill-current" />
                        </div>
                      )}
                      <div className="glass px-3 py-1 rounded-full shadow-sm bg-white/70 backdrop-blur-md">
                        <span className="text-[10px] font-bold tracking-tight uppercase tracking-widest text-charcoal">
                          {formatPropertyTypeLabel(item.property_type || item.type) || 'Stay'}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleWishlistToggle(item.property_id); }}
                      className="absolute top-3 right-3 text-white z-20"
                      aria-label="Toggle wishlist"
                    >
                      <Heart className={`w-5 h-5 drop-shadow-md ${wishlist.includes(item.property_id) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                    </button>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-charcoal text-sm md:text-base line-clamp-1">{item.title}</h3>
                    <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-charcoal-muted">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{item.city || 'Maharashtra'}{item.state ? `, ${item.state}` : ''}</span>
                    </p>
                    <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-charcoal-muted font-semibold line-clamp-1">
                      Up to {item.max_guests || item.guests || 4} Guests
                      <span className="mx-1">-</span>
                      {item.bedrooms || item.rooms || 1} Room{(item.bedrooms || item.rooms || 1) > 1 ? 's' : ''}
                      <span className="mx-1">-</span>
                      {item.bathrooms || item.baths || 1} Bath{(item.bathrooms || item.baths || 1) > 1 ? 's' : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===== Discover Our Collections — Full Width ===== */}
        <CollectionsSection
          navigate={navigate}
          properties={properties}
          wishlist={wishlist}
          handleWishlistToggle={handleWishlistToggle}
          getImageUrl={getImageUrl}
        />

        {/* Property Sliders — also full-width, padded inline */}
        <div className="pb-4 md:pb-16 pt-2 md:pt-4">
          {/* Residential Collection Slider */}
          <ScrollReveal duration="duration-[900ms]">
            {renderPropertySlider(
              'slider-residential',
              'Residential Collection',
              'Luxury homes, apartments, and private stays.',
              Building2,
              'residential',
              properties.residential
            )}
          </ScrollReveal>

          {/* Commercial Spaces Slider */}
          <ScrollReveal duration="duration-[900ms]">
            {renderPropertySlider(
              'slider-commercial',
              'Commercial Spaces',
              'Premium offices, co-working spaces, and retail.',
              Briefcase,
              'commercial',
              properties.commercial
            )}
          </ScrollReveal>

          {/* ===== The X-Space360 Standard Banner (Full Width Landscape Slider) ===== */}
          {(() => {
            // Local stateful slider inside an IIFE
            const StandardSlider = () => {
              const slides = [
                {
                  id: 'standard',
                  image: 'https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&q=80&w=1600',
                  tag: 'Hospitality Reimagined',
                  title: 'The X-Space360 Standard',
                  subtitle: 'Handpicked signature features that make every stay feel elevated, effortless, and memorable.'
                }
              ];
              const [currentIndex, setCurrentIndex] = useState(0);

              useEffect(() => {
                if (slides.length <= 1) return;
                const interval = setInterval(() => {
                  setCurrentIndex((prev) => (prev + 1) % slides.length);
                }, 7000);
                return () => clearInterval(interval);
              }, [slides.length]);

              const currentSlide = slides[currentIndex];

              return (
                <div className="relative w-full min-h-[420px] md:h-[620px] overflow-hidden my-12 md:my-16 rounded-none">
                  {/* Sliding Background Images */}
                  {slides.map((slide, idx) => (
                    <div
                      key={idx}
                      className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                        idx === currentIndex ? 'opacity-100 z-0' : 'opacity-0 z-[-1]'
                      }`}
                    >
                      <img
                        src={slide.image}
                        alt={slide.tag}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  
                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/55 to-black/90 z-10" />

                  {/* Slider Dots indicators */}
                  {slides.length > 1 && (
                    <div className="absolute bottom-6 left-8 md:left-12 z-30 flex items-center space-x-2">
                      {slides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentIndex(idx)}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            idx === currentIndex 
                              ? 'w-8 bg-amber-400' 
                              : 'w-2 bg-white/40 hover:bg-white/80'
                          }`}
                          aria-label={`Go to slide ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Floating Content Card on the right */}
                  <div className="absolute inset-y-0 right-0 w-full md:w-[500px] lg:w-[580px] flex flex-col justify-center px-6 py-8 md:px-12 text-left text-white z-20">
                    <div className="max-w-[95%] md:max-w-none mb-4 md:mb-6">
                      <span className="text-amber-400 font-extrabold text-[9px] md:text-[10px] uppercase tracking-[0.22em] mb-2 block">
                        {currentSlide.tag}
                      </span>
                      <h3 className="font-lufga text-[1.9rem] leading-[1.1] md:text-4xl font-bold mb-2 md:mb-3 tracking-tight text-white">
                        {currentSlide.title}
                      </h3>
                      <p className="text-white/80 text-[11px] md:text-sm leading-relaxed max-w-[32rem]">
                        {currentSlide.subtitle}
                      </p>
                    </div>

                    {/* Dynamic Content depending on slide */}
                    {currentSlide.id === 'standard' ? (
                      /* Features Grid for Slide 1 */
                      <div className="grid grid-cols-2 gap-y-3 gap-x-3 md:gap-y-5 md:gap-x-4">

                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" className="w-7 h-7 md:w-8 md:h-8" fill="none">
                              <defs>
                                <linearGradient id="chefGrad" x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor="#fbd38d" />
                                  <stop offset="100%" stopColor="#dd6b20" />
                                </linearGradient>
                              </defs>
                              <path d="M6 18c0-3.5 2-6.5 5-7.5V9.5C9.5 9 8.5 7.5 8.5 6c0-2.2 1.8-4 4-4s4 1.8 4 4c0 1.5-1 3-2.5 3.5v1c3 1 5 4 5 7.5H6z" fill="url(#chefGrad)" />
                              <rect x="7" y="18" width="10" height="3" rx="1.5" fill="#e2e8f0" />
                            </svg>
                          </div>
                          <div>
                            <h5 className="font-semibold text-[12px] md:text-sm text-white leading-tight">In-house Chef</h5>
                            <p className="text-white/60 text-[9px] md:text-[10px] mt-0.5">Gourmet dining on demand</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" className="w-7 h-7 md:w-8 md:h-8" fill="none">
                              <defs>
                                <linearGradient id="butlerGrad" x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor="#ecc94b" />
                                  <stop offset="100%" stopColor="#b7791f" />
                                </linearGradient>
                              </defs>
                              <path d="M4 4h16v16H4z" fill="#2d3748" className="opacity-10" />
                              <path d="M4 4l8 8 8-8v16H4V4z" fill="#1a202c" />
                              <path d="M8 4l4 4 4-4H8z" fill="#edf2f7" />
                              <path d="M10 8h4v1.5h-4z" fill="url(#butlerGrad)" />
                              <circle cx="12" cy="12" r="1.5" fill="url(#butlerGrad)" />
                              <circle cx="12" cy="15" r="1.5" fill="url(#butlerGrad)" />
                            </svg>
                          </div>
                          <div>
                            <h5 className="font-semibold text-[12px] md:text-sm text-white leading-tight">Butler Service</h5>
                            <p className="text-white/60 text-[9px] md:text-[10px] mt-0.5">Personalized assistance</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" className="w-7 h-7 md:w-8 md:h-8" fill="none">
                              <defs>
                                <linearGradient id="careGrad" x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor="#f6ad55" />
                                  <stop offset="100%" stopColor="#dd6b20" />
                                </linearGradient>
                              </defs>
                              <circle cx="10" cy="10" r="6" stroke="url(#careGrad)" strokeWidth="3" />
                              <path d="M14.5 14.5L21 21" stroke="url(#careGrad)" strokeWidth="3" strokeLinecap="round" />
                              <path d="M10 6l1 2.5L13.5 9l-2.5 1L10 12.5l-1-2.5-2.5-1 2.5-1z" fill="#ecc94b" />
                            </svg>
                          </div>
                          <div>
                            <h5 className="font-semibold text-[12px] md:text-sm text-white leading-tight">Caretaker Onsite</h5>
                            <p className="text-white/60 text-[9px] md:text-[10px] mt-0.5">24/7 guest support</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" className="w-7 h-7 md:w-8 md:h-8" fill="none">
                              <defs>
                                <linearGradient id="compGrad" x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor="#63b3ed" />
                                  <stop offset="100%" stopColor="#3182ce" />
                                </linearGradient>
                              </defs>
                              <circle cx="12" cy="12" r="9" stroke="url(#compGrad)" strokeWidth="2.5" />
                              <path d="M12 3v2M12 19v2M3 12h2M19 12h2" stroke="url(#compGrad)" strokeWidth="1.5" strokeLinecap="round" />
                              <path d="M12 12l3-5-1 4 4 1-6 0z" fill="#e53e3e" />
                              <path d="M12 12l-3 5 1-4-4-1 6 0z" fill="#e2e8f0" />
                            </svg>
                          </div>
                          <div>
                            <h5 className="font-semibold text-[12px] md:text-sm text-white leading-tight">Local Experiences</h5>
                            <p className="text-white/60 text-[9px] md:text-[10px] mt-0.5">Curated local guides</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" className="w-7 h-7 md:w-8 md:h-8" fill="none">
                              <defs>
                                <linearGradient id="gameGrad" x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor="#fc8181" />
                                  <stop offset="100%" stopColor="#e53e3e" />
                                </linearGradient>
                              </defs>
                              <rect x="3" y="5" width="11" height="15" rx="1.5" fill="#edf2f7" stroke="#cbd5e0" strokeWidth="1.5" transform="rotate(-10 3 5)" />
                              <rect x="9" y="4" width="11" height="15" rx="1.5" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
                              <path d="M14.5 10c0-1.5-2.5-3-2.5-3s-2.5 1.5-2.5 3c0 1 1 2 2.5 3.5 1.5-1.5 2.5-2.5 2.5-3.5z" fill="url(#gameGrad)" />
                            </svg>
                          </div>
                          <div>
                            <h5 className="font-semibold text-[12px] md:text-sm text-white leading-tight">Recreation & Games</h5>
                            <p className="text-white/60 text-[9px] md:text-[10px] mt-0.5">Indoor & outdoor setups</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" className="w-7 h-7 md:w-8 md:h-8" fill="none">
                              <defs>
                                <linearGradient id="grassGrad" x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor="#68d391" />
                                  <stop offset="100%" stopColor="#2f855a" />
                                </linearGradient>
                              </defs>
                              <path d="M12 22C12 15 8 10 4 8c4 4 6 9 8 14z" fill="url(#grassGrad)" />
                              <path d="M12 22C12 12 17 6 21 3c-2 6-4 13-9 19z" fill="url(#grassGrad)" />
                              <path d="M12 22c0-8 3-14 7-17-2 5-3 10-7 17z" fill="url(#grassGrad)" opacity="0.8" />
                            </svg>
                          </div>
                          <div>
                            <h5 className="font-semibold text-[12px] md:text-sm text-white leading-tight">Green Open Spaces</h5>
                            <p className="text-white/60 text-[9px] md:text-[10px] mt-0.5">Lush gardens & lawns</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" className="w-7 h-7 md:w-8 md:h-8" fill="none">
                              <defs>
                                <linearGradient id="popGrad" x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor="#fbb6ce" />
                                  <stop offset="100%" stopColor="#d53f8c" />
                                </linearGradient>
                              </defs>
                              <path d="M5 19l6-6 3 3-6 6H5v-3z" fill="url(#popGrad)" />
                              <path d="M14 11l4-4 2 2-4 4-2-2z" fill="#edf2f7" />
                              <circle cx="16" cy="6" r="1.5" fill="#f6ad55" />
                              <circle cx="19" cy="11" r="1" fill="#ecc94b" />
                              <circle cx="20" cy="5" r="1" fill="#4fd1c5" />
                              <path d="M11 11c3-3 6-3 8-5M12 12c1-3 3-5 5-5" stroke="#ecc94b" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </div>
                          <div>
                            <h5 className="font-semibold text-[12px] md:text-sm text-white leading-tight">Custom Events</h5>
                            <p className="text-white/60 text-[9px] md:text-[10px] mt-0.5">Bespoke celebrations</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Promise List for Slide 2 */
                      <div className="space-y-3 md:space-y-4">
                        <div className="flex items-start gap-3.5">
                          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-black/40 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-md">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 md:w-6 md:h-6" fill="none">
                              <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-5.45 8-12V5l-8-3z" fill="#D4AF37" opacity="0.3" />
                              <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-5.45 8-12V5l-8-3z" stroke="#FBBF24" strokeWidth="1.5" />
                              <path d="M9 12l2 2 4-4" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                          <div>
                            <h5 className="font-semibold text-xs md:text-sm text-white leading-snug">Every villa, personally verified</h5>
                            <p className="text-white/70 text-[10px] md:text-xs mt-0.5 leading-relaxed">We visit, assess, and curate. No listing makes it without meeting our standard.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3.5">
                          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-black/40 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-md">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 md:w-6 md:h-6" fill="none">
                              <circle cx="12" cy="12" r="9" fill="#DD6B20" opacity="0.3" />
                              <path d="M12 6v6l4 2" stroke="#FBD38D" strokeWidth="2" strokeLinecap="round" />
                              <path d="M7 17c2-1 4-1 5 0s3 1 5 0" stroke="#FBD38D" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </div>
                          <div>
                            <h5 className="font-semibold text-xs md:text-sm text-white leading-snug">In-villa dining & experiences</h5>
                            <p className="text-white/70 text-[10px] md:text-xs mt-0.5 leading-relaxed">Private chefs, bonfire setups, curated celebrations — we handle the memories.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3.5">
                          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-black/40 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-md">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 md:w-6 md:h-6" fill="none">
                              <circle cx="12" cy="8" r="4" stroke="#FBBF24" strokeWidth="1.5" fill="#D4AF37" opacity="0.3" />
                              <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </div>
                          <div>
                            <h5 className="font-semibold text-xs md:text-sm text-white leading-snug">A dedicated host, start to finish</h5>
                            <p className="text-white/70 text-[10px] md:text-xs mt-0.5 leading-relaxed">One point of contact from booking to checkout. No call centers, no runarounds.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3.5">
                          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-black/40 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-md">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 md:w-6 md:h-6" fill="none">
                              <rect x="5" y="10" width="14" height="10" rx="2" stroke="#34D399" strokeWidth="1.5" fill="#059669" opacity="0.3" />
                              <path d="M8 10V7a4 4 0 118 0v3" stroke="#34D399" strokeWidth="1.5" />
                              <circle cx="12" cy="15" r="1.5" fill="#34D399" />
                            </svg>
                          </div>
                          <div>
                            <h5 className="font-semibold text-xs md:text-sm text-white leading-snug">Transparent pricing, always</h5>
                            <p className="text-white/70 text-[10px] md:text-xs mt-0.5 leading-relaxed">What you see is what you pay. No surprise charges at checkout, ever.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            };
            return (
              <ScrollReveal duration="duration-[1000ms]">
                <StandardSlider />
              </ScrollReveal>
            );
          })()}

          {/* Events & Functions Slider */}
          <ScrollReveal duration="duration-[900ms]">
            {renderPropertySlider(
              'slider-events',
              'Events & Functions',
              'Banquet halls, garden lawns, and celebration venues.',
              PartyPopper,
              'event_venue',
              properties.event_venue
            )}
          </ScrollReveal>


          {/* Post Property Free Banner */}
          <ScrollReveal duration="duration-[800ms]">
            <div className="max-w-[1440px] mx-auto px-4 md:px-8 mb-8 md:mb-12">
              <div className="bg-[#FFF9EA] border border-[#FBEFCD] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div className="text-left">
                  <h4 className="text-xl md:text-2xl font-bold text-charcoal flex items-baseline gap-1.5">
                    <span>Post your Property for</span>
                    <span className="font-serif italic text-terracotta text-2xl md:text-3xl leading-none">Free</span>
                  </h4>
                  <p className="text-gray-550 text-xs md:text-sm font-medium mt-1">
                    List it on X-Space360 and get genuine, verified booking leads.
                  </p>
                </div>
                <button 
                  onClick={() => navigate(user ? '/host/list-property' : '/register?role=host')}
                  className="self-start md:self-auto bg-[#FBBF24] hover:bg-[#F59E0B] text-charcoal font-bold px-6 py-3 rounded-full shadow-sm hover:scale-[1.02] active:scale-95 transition-all text-xs md:text-sm flex items-center gap-2 cursor-pointer duration-200"
                >
                  <span>Post Property</span>
                  <span className="bg-white text-[9px] text-[#D97706] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider">Free</span>
                </button>
              </div>
            </div>
          </ScrollReveal>

          {/* Ad Campaign Banner (Promo Only) */}
          <ScrollReveal duration="duration-[1000ms]">
            <div className="max-w-[1440px] mx-auto px-4 md:px-8 mb-12 md:mb-24">
              <div className="relative rounded-[2rem] overflow-hidden shadow-premium h-[300px] md:h-[350px] bg-stone">
                <div className="absolute inset-0 flex items-center">
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('/images/premium_banner_bg.png')` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-charcoal/80 via-charcoal/40 to-transparent" />
                  
                  <div className="relative z-10 w-full px-8 md:px-16 text-left max-w-xl md:max-w-2xl text-white">
                    <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-3 text-white">
                      Save on your next luxury stay
                    </h3>
                    <p className="text-white/95 text-xs md:text-sm font-semibold leading-relaxed mb-6 max-w-md">
                      We've pulled together some top premium deals, so you can find an amazing residential, commercial, or event space at an even better price.
                    </p>
                    <button 
                      onClick={() => navigate('/guest/browse')}
                      className="bg-white hover:bg-stone text-charcoal font-bold px-8 py-3 rounded-full transition shadow-premium text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 duration-200"
                    >
                      See Property Deals
                    </button>
                  </div>

                  {/* Floating Badge */}
                  <div className="hidden md:flex absolute right-24 top-1/2 -translate-y-1/2 z-10 bg-white text-blue-600 px-5 py-3 rounded-2xl shadow-elevated items-center gap-3 border border-sand-200">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <Hotel className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Up to</p>
                      <p className="text-xl font-black text-blue-600 tracking-tight leading-none mt-1">35% off</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>{/* end banner px-wrapper */}

          {/* ===== Signature Series Split Banner & Carousel Section ===== */}
          {(() => {
            const SignatureSplitBanner = () => {
              const handleArrowClick = (direction) => {
                const slider = document.getElementById('signature-properties-scroll');
                if (slider) {
                  const scrollAmount = direction === 'left' ? -350 : 350;
                  slider.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                }
              };

              return (
                <div className="w-full bg-[#F5F2EB] py-16 border-t border-b border-sand-200/60 mt-16 mb-24">
                  <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8">
                    <div className="w-full bg-[#E5DFD9] rounded-3xl overflow-hidden shadow-lg flex flex-col md:flex-row h-auto md:h-[380px] mb-16 border border-[#dcd6d0]">
                      <div className="w-full md:w-[45%] p-8 md:p-10 flex flex-col justify-center text-left text-[#3c3732]">
                        <div>
                          <h4 className="font-serif text-xl md:text-2xl font-bold leading-relaxed mb-6">
                            Indulge in India's <span className="italic font-normal">finest</span> ultra-luxury private estates, handpicked for the discerning traveler...
                          </h4>
                          <ul className="space-y-3.5 text-xs font-semibold text-[#5a544e]">
                            <li className="flex items-center gap-2.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#8c7b50]" />
                              Handpicked, ultra-luxury private villas & resorts
                            </li>
                            <li className="flex items-center gap-2.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#8c7b50]" />
                              Private pools, master chefs & personal butler service
                            </li>
                            <li className="flex items-center gap-2.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#8c7b50]" />
                              Complete privacy and verified premium stays
                            </li>
                            <li className="flex items-center gap-2.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#8c7b50]" />
                              Seamless and direct bookings
                            </li>
                          </ul>
                        </div>
                      </div>

                    <div className="w-full md:w-[55%] relative h-[280px] md:h-full overflow-hidden">
                      <img
                        src="/videos/Discover our collection/Signature series/3baaabd56fa442979578b06924b47477.jpg"
                        alt="Horizon Block Nashik"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-[#8c7b50]/15 mix-blend-multiply pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent z-10 pointer-events-none" />

                      <div className="absolute bottom-6 left-6 z-20 text-left text-white">
                        <h5 className="font-serif text-lg font-bold leading-tight text-white">Horizon Block</h5>
                        <p className="text-white/80 text-[10px] uppercase tracking-wider mt-0.5">Nashik, Maharashtra</p>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Signature Properties list */}
                  <div className="w-full text-left relative mt-16">
                    <div className="flex justify-between items-end mb-6">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-serif-hero text-[20px] md:text-[28px] font-semibold text-[#1E1E1E]">
                            Signature Series
                          </h3>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black border border-[#D4AF37] text-[9px] font-serif font-bold uppercase tracking-[0.15em] text-[#D4AF37] shadow-lg shrink-0">
                            <Crown className="w-3.5 h-3.5 text-[#D4AF37] fill-[#D4AF37]/20" />
                            SIGNATURE SERIES
                          </span>
                        </div>
                        <p className="text-gray-505 text-gray-500 font-medium text-xs md:text-sm mt-1.5">
                          Handpicked, ultra-premium villas starting from ₹50,000/night.
                        </p>
                      </div>
                      
                      {/* Nav Arrows */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleArrowClick('left')}
                          className="w-9 h-9 rounded-full border border-gray-250 flex items-center justify-center hover:bg-stone-50 transition cursor-pointer animate-scale-in"
                          aria-label="Previous Properties"
                        >
                          <ChevronLeft className="w-5 h-5 text-charcoal-muted" />
                        </button>
                        <button
                          onClick={() => handleArrowClick('right')}
                          className="w-9 h-9 rounded-full border border-gray-250 flex items-center justify-center hover:bg-stone-50 transition cursor-pointer animate-scale-in"
                          aria-label="Next Properties"
                        >
                          <ChevronRight className="w-5 h-5 text-charcoal-muted" />
                        </button>
                      </div>
                    </div>

                    {/* Scrollable list */}
                    <div
                      id="signature-properties-scroll"
                      className="flex gap-6 overflow-x-auto no-scrollbar pb-4"
                    >
                      {signatureProperties.length > 0 ? (
                        signatureProperties.map((item) => (
                          <div
                            key={item.property_id}
                            onClick={() => navigate(`/property/${item.property_id}`)}
                            className="min-w-[280px] md:min-w-[310px] max-w-[310px] bg-white rounded-3xl overflow-hidden border border-gray-150 shadow-subtle flex-shrink-0 group cursor-pointer"
                          >
                            <div className="relative h-48 md:h-52 overflow-hidden">
                              <img
                                src={getPropertyCardImage(item)}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                              />
                              {/* Goldenblack Signature Badge */}
                              <div className="absolute top-3 left-3 z-10">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-black/95 border border-[#D4AF37] text-[8px] font-serif font-bold uppercase tracking-wider text-[#D4AF37] shadow">
                                  <Crown className="w-2.5 h-2.5 text-[#D4AF37] fill-[#D4AF37]/20" />
                                  SIGNATURE SERIES
                                </span>
                              </div>
                              {/* Favorite Icon */}
                              {(!user || user.role === 'guest') && (
                                <div className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white shadow-sm transition-all duration-300 z-10">
                                  <Heart 
                                    className={`w-4 h-4 transition-colors ${
                                      wishlist.includes(item.property_id) ? 'text-red-500 fill-red-500' : 'text-charcoal hover:text-red-500'
                                    }`} 
                                    onClick={(e) => { e.stopPropagation(); handleWishlistToggle(item.property_id); }}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="p-5 text-left">
                              <h4 className="font-bold text-sm text-charcoal truncate mb-1 group-hover:text-amber-600 transition-colors">
                                {item.title}
                              </h4>
                              <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-wider mb-3 truncate" title={`${formatPropertyTypeLabel(item.property_type || item.type)} in ${item.address ? `${item.address}, ` : ''}${item.city}`}>
                                {formatPropertyTypeLabel(item.property_type || item.type) || 'Villa'} in {item.address ? `${item.address}, ` : ''}{item.city}
                              </p>
                              <div className="flex items-baseline gap-1">
                                <span className="font-black text-sm text-charcoal">₹{Math.round(Number(item.display_price_per_night ?? item.customer_price_per_night ?? item.price_per_night ?? item.price ?? 0)).toLocaleString('en-IN')}</span>
                                <span className="text-[10px] text-gray-500 font-semibold">/ night</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        /* Placeholder when database has no 50k+ villas/resorts yet */
                        <div className="min-w-[280px] md:min-w-[310px] max-w-[310px] bg-gray-50 rounded-3xl overflow-hidden border border-dashed border-gray-250 p-6 flex flex-col justify-center items-center text-center text-gray-400 font-medium">
                          <p className="text-xs">No active Signature Series properties currently available.</p>
                        </div>
                      )}

                      {/* View All Card at the end */}
                      <div
                        onClick={() => navigate('/guest/browse?signature=true')}
                        className="min-w-[280px] md:min-w-[310px] max-w-[310px] bg-[#fbfbfa] hover:bg-[#E5DFD9]/60 rounded-3xl overflow-hidden border-2 border-dashed border-gray-200 flex-shrink-0 flex flex-col justify-center items-center p-8 group cursor-pointer transition-all duration-300"
                      >
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300 mb-4 border border-gray-100">
                          <ArrowRight className="w-5 h-5 text-[#8c7b50]" />
                        </div>
                        <h4 className="font-bold text-sm text-charcoal mb-1 group-hover:text-[#8c7b50] transition-colors">
                          View All Signature
                        </h4>
                        <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-wider">
                          Browse all premium properties
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
            };
            return (
              <ScrollReveal duration="duration-[900ms]">
                <SignatureSplitBanner />
              </ScrollReveal>
            );
          })()}

                    {/* Testimonials (Loved by Guests & Hosts) */}
          <ScrollReveal duration="duration-[900ms]">
            <div className="mb-12 md:mb-32 text-center">
            <span className="text-xs font-bold tracking-tight tracking-[0.2em] text-terracotta uppercase">{t('guestStories')}</span>
            <h3 className="text-4xl font-bold text-charcoal mt-3 mb-4 tracking-tight">{t('lovedByGuests')}</h3>
            <p className="text-gray-550 text-gray-500 font-medium max-w-xl mx-auto mb-16">{t('testimonialsSub')}</p>
            
            <div className="max-w-7xl mx-auto relative px-4 md:px-8">
              <div 
                id="slider-testimonials" 
                onScroll={(e) => handleSliderScroll(e, setActiveTestimonial)}
                className="flex overflow-x-auto pb-10 px-4 md:px-8 gap-6 no-scrollbar snap-x scroll-smooth"
              >
                {(cmsContent?.testimonials?.items?.map(item => ({
                  stars: item.rating || 5,
                  text: item.comment || item.text || "",
                  author: item.name || item.author || "",
                  role: item.role || "",
                  avatar: item.avatar_url || item.avatar || ""
                })) || [
                  {
                    stars: 5,
                    text: "Golden Rich Stay spaces are absolutely stunning. The Wi-Fi is blazing fast and the locations are perfect for work-cations.",
                    author: "Ananya Sen",
                    role: "Consultant & Remote Worker",
                    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100"
                  },
                  {
                    stars: 5,
                    text: "Listing my commercial space was incredibly smooth. The automated payout verification is rock solid.",
                    author: "Rohan Deshmukh",
                    role: "Property Host",
                    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"
                  },
                  {
                    stars: 5,
                    text: "Booked an event venue for our product launch. The geo-coordinates and Leaflet mapping made it easy for everyone to find.",
                    author: "Priya Nair",
                    role: "Event Organizer",
                    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100"
                  }
                ]).map((item, idx) => (
                  <div key={idx} className="bg-white rounded-2xl p-6 border border-gray-100 text-left flex flex-col justify-between transition-all duration-300 min-w-[260px] sm:min-w-[300px] md:min-w-[320px] snap-center flex-1 relative hover:border-black/10 hover:shadow-md">
                    <span className="hidden absolute top-6 right-8 text-6xl font-serif text-terracotta/15 select-none pointer-events-none">“</span>
                    <div>
                      <div className="flex items-center space-x-1 text-[#d4af37] mb-4">
                        {[...Array(item.stars)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                      <p className="text-slate-650 text-slate-600 text-sm leading-relaxed mb-6 font-medium">
                        "{item.text}"
                      </p>
                    </div>
                    <div className="flex items-center space-x-3 border-t border-slate-100 pt-4 mt-auto">
                      <img src={item.avatar} alt={item.author} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <h4 className="font-bold text-charcoal text-[11px] tracking-tight">{item.author}</h4>
                        <p className="text-slate-450 text-slate-400 text-[9px] font-semibold uppercase tracking-wider mt-0.5">{item.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Testimonials Dot indicators ── */}
              <div className="flex justify-center mt-2">
                <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-full flex items-center justify-center gap-2.5 shadow-subtle">
                  {(cmsContent?.testimonials?.items || [1, 2, 3]).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => scrollToSlide('slider-testimonials', idx)}
                      className={`rounded-full transition-all duration-300 ${
                        idx === activeTestimonial
                          ? 'w-2.5 h-2.5 bg-terracotta/60'
                          : 'w-2 h-2 bg-white/30 hover:bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          </ScrollReveal>
          {/* Blogs Section (Clean 2x2 Grid) */}
          <ScrollReveal duration="duration-[900ms]">
            <div className="mb-12 md:mb-32 text-left max-w-7xl mx-auto px-4 md:px-8">
              <h3 className="text-3xl md:text-4xl font-bold text-charcoal tracking-tight mb-8">
              Plan smart, explore more
            </h3>

            <div className="flex gap-6 overflow-x-auto pb-3 no-scrollbar md:grid md:grid-cols-2 md:gap-x-12 md:gap-y-10 md:overflow-visible">
              {landingBlogPosts.map((post, idx) => (
                <div 
                  key={post.id || idx} 
                  onClick={() => setSelectedPost({
                    id: post.id,
                    title: post.title,
                    excerpt: post.excerpt,
                    content: post.content,
                    date: post.date,
                    author: post.author,
                    image_url: post.img,
                    read_time: post.read_time || '5 min read'
                  })}
                  className="group cursor-pointer flex min-w-[290px] max-w-[290px] flex-col text-left md:min-w-0 md:max-w-none"
                >
                  {/* Rectangular Image */}
                  <div className="aspect-[2/1] overflow-hidden rounded-xl bg-stone relative">
                    <img 
                      src={post.img} 
                      alt={post.title} 
                      className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-500" 
                    />
                  </div>
                  
                  {/* Metadata underneath */}
                  <h4 className="font-bold text-lg md:text-xl text-charcoal mt-4 mb-2 leading-snug group-hover:text-terracotta transition-colors line-clamp-2">
                    {post.title}
                  </h4>
                  <p className="text-xs text-gray-500 font-semibold">
                    {post.date} &nbsp;•&nbsp; <span className="text-blue-600 hover:underline">{post.author}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
          </ScrollReveal>

          {false && (
          <ScrollReveal duration="duration-[950ms]">
            <div className="max-w-7xl mx-auto px-4 md:px-8 mb-8 md:mb-12 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12 text-left">
              {/* Left Info Panel */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-4">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none">FAQS</span>
              <h3 className="text-3xl md:text-5xl font-black text-charcoal tracking-tight leading-tight">
                Questions people ask before they start.
              </h3>
              <p className="text-gray-505 text-gray-500 font-medium text-sm md:text-base leading-relaxed">
                Still need help? Book a 15-minute call with an advisor — no pressure, no commitment.
              </p>
              <div className="pt-2">
                <button 
                  onClick={() => navigate('/support')}
                  className="bg-black hover:bg-black/90 text-white font-bold px-8 py-3.5 rounded-full transition shadow-premium text-xs uppercase tracking-widest inline-flex items-center gap-2"
                >
                  <span>Contact Advisor</span>
                  <span className="text-xs">↗</span>
                </button>
              </div>
            </div>

            {/* Right Accordion List */}
            <div className="lg:col-span-7 space-y-4">
              {[
                {
                  question: "What is X-Space360 and how does it work?",
                  answer: "X-Space360 is a curated premium short-term rental network. We connect property owners (hosts) with guests seeking high-end residential, commercial, or event spaces. All listed spaces undergo a strict coordinate geofencing and physical RM (Relationship Manager) quality audit before going live."
                },
                {
                  question: "How can I register my property as a Host?",
                  answer: "You can register as a Host from our portal. You need to upload standard verification documents (Aadhaar Card, Property Proof, cancelled cheque, and Shop Act license). Our team will schedule a physical inspection, and once verified, your property gets a green trust badge and goes live."
                },
                {
                  question: "What types of properties can I list?",
                  answer: "You can list three main categories of properties: Residential (apartments, villas, studios, farmhouses), Commercial (private offices, meeting rooms, co-working desks), and Event Venues (banquet halls, garden lawns, rooftops)."
                },
                {
                  question: "How are guest bookings and payments secured?",
                  answer: "We use dynamic checkout locks with secure signatures (via Razorpay double locks). When a guest reserves, a 10-minute lock blocks the calendar to prevent double bookings. Payouts are directly settled to the host's bank account following tax-compliant invoice protocols."
                },
                {
                  question: "Are there any hidden fees or charges for listing?",
                  answer: "No. There are no hidden fees. A refundable registration fee of ₹500 is charged during host document submission, which initiates the physical verification audit. All subscription tiers start with an extensive 3-month free trial."
                }
              ].map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div 
                    key={index} 
                    className="bg-white rounded-2xl border border-sand-200 shadow-sm transition-all duration-300 overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-sm md:text-base text-charcoal hover:bg-stone/20 transition-colors"
                    >
                      <span>{faq.question}</span>
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-gray-500 shrink-0 ml-4" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500 shrink-0 ml-4" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-6 text-xs md:text-sm text-gray-500 font-semibold leading-relaxed border-t border-sand-100 pt-4 animate-slide-down">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          </ScrollReveal>
          )}


          
        </div>
      </div>

      {/* Main Footer Section */}
      <footer className="relative overflow-hidden border-t border-white/10 bg-[#081321] text-white shadow-premium">
        <div className="absolute inset-0 bg-[#081321] pointer-events-none" />
        <div className="relative z-10 w-full px-6 py-16 md:px-10 md:py-16 lg:px-14 xl:px-20">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.45fr_repeat(5,1fr)] lg:gap-12">
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

            {footerDisplaySections.map((section) => (
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

      
      {footerPopup && (
        <div className="fixed inset-0 z-[120] bg-charcoal/70 backdrop-blur-sm flex items-center justify-center px-4 py-6">
          <div
            className="bg-white rounded-2xl shadow-elevated border border-gray-100 w-full max-w-4xl max-h-[88vh] overflow-hidden animate-scale-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="footer-legal-title"
          >
            <div className="px-6 py-5 md:px-8 border-b border-gray-100 bg-white flex items-start justify-between gap-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-terracotta mb-2">
                  Legal Document
                </p>
                <h3 id="footer-legal-title" className="text-2xl md:text-3xl font-bold tracking-tight text-charcoal">
                  {footerPopup.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFooterPopup(null)}
                className="w-10 h-10 rounded-full border border-gray-100 text-charcoal-muted hover:text-charcoal hover:bg-stone transition flex items-center justify-center shrink-0"
                aria-label="Close footer details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[calc(88vh-96px)] overflow-y-auto px-6 py-6 md:px-10 md:py-8">
              <div className="rounded-xl border border-gray-100 bg-stone/40 px-4 py-3 mb-5">
                <p className="text-xs leading-relaxed text-charcoal-muted">
                  Please review this document carefully. These terms explain your rights, responsibilities, and platform usage conditions.
                </p>
              </div>
              <LegalDocument text={footerPopup.text} />
            </div>
          </div>
        </div>
      )}

      <ChatbotWidget />

      {/* Premium How It Works: Step-by-Step Host Onboarding Modal Component */}
      {(() => {
        const iconMap = {
          User: User,
          CreditCard: CreditCard,
          Building2: Building2,
          MapPin: MapPin,
          Sparkles: Sparkles
        };
        const defaultSteps = [
          {
            id: 1,
            icon: User,
            shortTitle: t('registrationShort'),
            heading: t('registrationHeading'),
            subtitle: t('registrationSubtitle'),
            paragraph: t('registrationParagraph'),
            bullets: [
              t('registrationBullet1'),
              t('registrationBullet2'),
              t('registrationBullet3')
            ]
          },
          {
            id: 2,
            icon: CreditCard,
            shortTitle: t('subscriptionShort'),
            heading: t('subscriptionHeading'),
            subtitle: t('subscriptionSubtitle'),
            paragraph: t('subscriptionParagraph'),
            bullets: [
              t('subscriptionBullet1'),
              t('subscriptionBullet2'),
              t('subscriptionBullet3')
            ]
          },
          {
            id: 3,
            icon: Building2,
            shortTitle: t('listingShort'),
            heading: t('listingHeading'),
            subtitle: t('listingSubtitle'),
            paragraph: t('listingParagraph'),
            bullets: [
              t('listingBullet1'),
              t('listingBullet2'),
              t('listingBullet3')
            ]
          },
          {
            id: 4,
            icon: MapPin,
            shortTitle: t('auditShort'),
            heading: t('auditHeading'),
            subtitle: t('auditSubtitle'),
            paragraph: t('auditParagraph'),
            bullets: [
              t('auditBullet1'),
              t('auditBullet2'),
              t('auditBullet3')
            ]
          },
          {
            id: 5,
            icon: Sparkles,
            shortTitle: t('earningsShort'),
            heading: t('earningsHeading'),
            subtitle: t('earningsSubtitle'),
            paragraph: t('earningsParagraph'),
            bullets: [
              t('earningsBullet1'),
              t('earningsBullet2'),
              t('earningsBullet3')
            ]
          }
        ];
        const stepsData = lang === 'en' && cmsContent?.how_it_works?.steps ? cmsContent.how_it_works.steps.map(s => ({
          ...s,
          icon: iconMap[s.icon_name] || Sparkles
        })) : defaultSteps;
        return (
          <>
            <HowItWorksModal 
              isOpen={showHowItWorksModal} 
              onClose={() => setShowHowItWorksModal(false)} 
              user={user} 
              navigate={navigate} 
              steps={stepsData}
              t={t}
            />

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
                  <div className="relative w-full md:w-[42%] h-[240px] md:h-auto overflow-hidden bg-charcoal-deep shrink-0">
                    <img 
                      src={getImageUrl(selectedPost.image_url)} 
                      alt={selectedPost.title} 
                      className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-[1.02]"
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-charcoal-deep/90 via-charcoal-deep/40 to-transparent z-10"></div>
                    
                    {/* Floating Info inside Image Column */}
                    <div className="absolute bottom-6 left-6 right-6 z-20 text-white">
                      <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold tracking-tight uppercase tracking-widest text-white mb-3 shadow-sm">
                        {selectedPost.read_time || '5 min read'}
                      </span>
                      <h4 className="text-lg md:text-xl font-bold tracking-tight font-serif italic text-sand-100 leading-tight">
                        "Curated perspectives on short-term rentals and spaces."
                      </h4>
                    </div>
                  </div>

                  {/* Right Column: Article Details & Content */}
                  <div className="flex-1 flex flex-col min-w-0 relative h-[calc(85vh-240px)] md:h-auto">
                    
                    {/* Header Controls */}
                    <div className="flex items-center justify-between p-6 md:p-8 pb-4 border-b border-sand-100">
                      {/* Date & Tagline */}
                      <div className="flex items-center space-x-2 text-xs font-bold tracking-tight text-terracotta uppercase tracking-[0.2em]">
                        <span>{t('ourJournal')}</span>
                        <span className="text-charcoal-muted font-normal">•</span>
                        <span className="text-charcoal-muted">{selectedPost.date}</span>
                      </div>
                      
                      {/* Close Button inside header controls */}
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
                      
                      {/* Title */}
                      <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-charcoal tracking-tight leading-tight">
                        {selectedPost.title}
                      </h3>

                      {/* Author Info */}
                      <div className="flex items-center space-x-3 bg-stone/70 border border-gray-100 rounded-2xl p-4">
                        <div className="w-10 h-10 rounded-full bg-sage text-white flex items-center justify-center text-sm font-bold tracking-tight shadow-sm shrink-0">
                          {selectedPost.author?.[0] || 'A'}
                        </div>
                        <div>
                          <p className="text-sm font-bold tracking-tight text-charcoal leading-tight">{selectedPost.author}</p>
                          <p className="text-[11px] text-charcoal-muted font-bold uppercase tracking-wider mt-0.5">X-Space360 Editorial Desk</p>
                        </div>
                      </div>

                      {/* Article Paragraphs */}
                      <div className="text-charcoal-light font-semibold text-sm md:text-base leading-relaxed space-y-5">
                        {selectedPost.content ? (
                          <ReactMarkdown>{selectedPost.content}</ReactMarkdown>
                        ) : selectedPost.id === 'p1' ? (
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
                              Curation, technology, and superior customer service are at the core of X-Space360. By focusing on rich aesthetics, verified properties, and high-speed amenities, we ensure both guests and hosts enjoy a premium, seamless renting experience.
                            </p>
                            <p>
                              We invite you to explore other articles on our journal to stay updated on the latest short-term rental trends, hosting tips, and travel destinations in India.
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </>
        );
      })()}
      {/* Floating Scroll Buttons - hidden on mobile to avoid blocking content */}
      <div className="hidden md:flex fixed top-1/2 -translate-y-1/2 right-8 flex-col space-y-3 z-50">
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center shadow-premium hover:bg-white/70 hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-white/20"
          title="Scroll to Top"
        >
          <ChevronUp className="w-5 h-5 text-charcoal" />
        </button>
        <button 
          onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
          className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center shadow-premium hover:bg-white/70 hover:translate-y-1 transition-all duration-300 cursor-pointer border border-white/20"
          title="Scroll to Bottom"
        >
          <ChevronDown className="w-5 h-5 text-charcoal" />
        </button>
      </div>
    </div>
  );
};

export default LandingPage;

