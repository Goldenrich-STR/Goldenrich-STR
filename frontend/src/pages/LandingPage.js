import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Crown, Building2, MapPin, Calendar, Star, Search, User, LogOut, CheckCircle2, ShieldCheck, ClipboardList, Sparkles, X, CreditCard, ArrowRight, Home, Briefcase, PartyPopper, Facebook, Instagram, Youtube, Heart, Share2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Menu, Compass, Trees, Waves, Hotel, Sunset, UserCheck, ChefHat, ConciergeBell, Gamepad2, Mail, Phone } from 'lucide-react';
import apiClient, { propertyAPI, getImageUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import ChatbotWidget from '../components/ChatbotWidget';
import LanguageSelector from '../components/LanguageSelector';
import { formatCategoryLabel, formatPropertyTypeLabel } from '../lib/displayLabels';
import { getRecentlyVisitedProperties, RECENTLY_VISITED_PROPERTIES_EVENT } from '../lib/recentlyVisitedProperties';
import LegalDocument from '../components/LegalDocument';
import ScrollReveal from '../components/ui/ScrollReveal';

const PROPERTY_IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800';

const DEFAULT_HERO_SLIDES = [
  {
    src: '/videos/hero/pexels-contact-me-923323219715-262056873-12703092.jpg',
    tag: 'COMMERCIAL SPACES',
    tagColor: 'text-white',
    titlePrefix: 'Premium Office ',
    titleHighlight: 'Spaces',
    highlightColor: 'text-white',
    titleSuffix: '',
    badges: ['15% OFF On Weekday Bookings*']
  },
  {
    src: '/videos/hero/pexels-liva-kitchens-and-interiors-2153927697-33452539.jpg',
    tag: 'RESIDENTIAL SPACES',
    tagColor: 'text-white',
    titlePrefix: 'Cozy Luxury ',
    titleHighlight: 'Homes',
    highlightColor: 'text-white',
    titleSuffix: '',
    badges: ['50% OFF on 2nd Night*']
  },
  {
    src: '/videos/hero/pexels-thevisionaryvows-33485961.jpg',
    tag: 'WEDDING VENUES',
    tagColor: 'text-white',
    titlePrefix: 'Beautiful Wedding ',
    titleHighlight: 'Venues',
    highlightColor: 'text-white',
    titleSuffix: '',
    badges: ['26% OFF On All Sunday Events']
  },
  {
    src: '/videos/hero/pexels-roman-odintsov-4870616.jpg',
    tag: 'RESORT VILLAS',
    tagColor: 'text-white',
    titlePrefix: 'Scenic Resort ',
    titleHighlight: 'Villas',
    highlightColor: 'text-white',
    titleSuffix: '',
    badges: ['30% OFF on Midweek Getaways*']
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
    eventVenueSub: 'Banquet halls, rooftops, and celebration venues.',
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
    modalJourney: 'Interactive Host Onboarding Journey',
    modalTitle: 'How It Works: Step-by-Step',
    modalDesc: 'X-Space360 provides a fully integrated, premium, physically verified short-term renting system. Click on the steps below to explore our interactive host pipeline.',
    activeStage: 'Active Stage {stage} of 5',
    rmInspection: 'RM Inspection Scheduled',
    auditProgress: 'Audit In-Progress',
    planTrial: 'Trial Enabled',
    selectedPlan: 'Selected',
    netPayout: 'Net Payout:',
    settled: 'Settled',
    onboardingGuidelines: 'Interactive Verification Guidelines',
    guidelineText: 'To ensure maximum trust for premium rentals, every listed space goes through coordinate parsing and Leaflet geofencing validations. When a host submits a property, the verification service assigns a field inspector.',
    guidelineBullet1: 'Manual GPS validation protects listings from clone fraud.',
    guidelineBullet2: 'Elite badge triggers a 2.5x increase in discover page visibility.',
    securePayments: 'Secure Payments & Guarantee',
    paymentsText: 'We secure host payments using automated checkout locks. When guest initiates a payment:',
    paymentsBullet1: '10-Minute Lock protects calendar double booking.',
    paymentsBullet2: 'Dynamic signature key validation guarantees secure transfer protocols.',
    paymentsBullet3: 'Direct bank settlement transfers funds to your ledger seamlessly.',
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
    registrationShort: 'Registration',
    registrationHeading: 'Host Registration & ID Verification',
    registrationSubtitle: 'Establish absolute safety and trust',
    registrationParagraph: 'Every host profile is verified through secured credentials to maintain guest safety. The verification process is completely automated and takes less than 5 minutes.',
    registrationBullet1: 'Government KYC & Aadhaar ID verification support.',
    registrationBullet2: 'Real-time SMS & WhatsApp onboarding confirmations.',
    registrationBullet3: 'Seamless account switching between Guest and Host mode in one click.',
    subscriptionShort: 'Subscription',
    subscriptionHeading: 'Flexible Subscription Tiers',
    subscriptionSubtitle: 'Designed to scale with your renting portfolio',
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

          <div className="flex overflow-x-auto no-scrollbar md:grid md:grid-cols-5 relative z-10 justify-between gap-4 md:gap-0 pb-2">
            {stepsData.map((step) => {
              const IconComponent = step.icon;
              const isActive = activeStep === step.id;
              const isCompleted = activeStep > step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className="flex flex-col items-center group focus:outline-none flex-shrink-0 w-20 md:w-auto"
                >
                  <div 
                    className={`w-16 h-16 rounded-full flex items-center justify-center shadow-premium transition-all duration-500 transform ${
                      isActive 
                        ? 'bg-terracotta text-white scale-110 ring-4 ring-terracotta/20 animate-pulse'
                        : isCompleted
                        ? 'bg-sage text-white'
                        : 'bg-white border-2 border-gray-200 text-charcoal hover:border-terracotta/50'
                    }`}
                  >
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <span className={`text-[10px] font-bold tracking-tight uppercase tracking-widest mt-3 transition-colors ${
                    isActive ? 'text-terracotta font-bold tracking-tight' : 'text-charcoal-muted group-hover:text-charcoal'
                  }`}>
                    {t('step')} {step.id}
                  </span>
                  <span className={`text-[9px] font-bold mt-1 text-center hidden sm:inline-block max-w-[90px] truncate ${
                    isActive ? 'text-terracotta font-bold tracking-tight' : 'text-charcoal-muted/70'
                  }`}>
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
  { city: "Pune", state: "Maharashtra", desc: "A hidden gem", icon: Hotel },
  { city: "Lonavala", state: "Maharashtra", desc: "For sights like Karla Caves", icon: Trees },
  { city: "Mumbai", state: "Maharashtra", desc: "For its top-notch dining", icon: Building2 },
  { city: "North Goa", state: "Goa", desc: "Popular beach destination", icon: Waves },
  { city: "Nashik", state: "Maharashtra", desc: "Near you", icon: Compass },
  { city: "Karjat", state: "Maharashtra", desc: "A hidden gem", icon: Home }
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

const DestinationLineIcon = ({ label }) => {
  const config = DESTINATION_CONFIGS[label] || { iconName: 'landscape' };
  
  return (
    <div className="relative flex items-center justify-center h-16 w-20 md:h-[74px] md:w-24">
      {/* Background blobs exactly as requested */}
      <svg viewBox="0 0 80 64" className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
        <path d="M48 7c10 7 12 20 7 34s-19 14-29 9S15 32 25 20 38 0 48 7z" fill="#F3A5AD" opacity="0.9" />
        <path d="M56 10c9 10 7 28-2 39s-24 11-30 2 3-20 12-29S47 0 56 10z" fill="#FFD4A6" opacity="0.9" />
      </svg>
      
      {/* Real Google Material Symbol */}
      <span className="material-symbols-outlined text-[32px] md:text-[36px] text-[#1F1F1F] font-light relative z-10 select-none">
        {config.iconName}
      </span>
    </div>
  );
};

const PREMIUM_COLLECTIONS = [
  {
    id: 'luxury-villas',
    label: 'Luxury Villas & Farmhouses',
    subtitle: 'Private pools, lush lawns & royal stays across India',
    detail: 'From Alibaug to Coorg, our hand-picked villas offer complete privacy, personal caretakers, BBQ setups & breathtaking views. Perfect for family vacations, pre-wedding shoots & weekend escapes.',
    tag: 'Most Booked',
    image: 'https://images.unsplash.com/photo-1744448365250-9b6aa1a7e4a3?auto=format&fit=crop&q=80&w=900',
    query: 'residential',
    property_type: 'villa'
  },
  {
    id: 'hilltop-retreats',
    label: 'Signature Series',
    subtitle: 'The ultimate pinnacle of private luxury stays',
    detail: 'A curated portfolio of India’s most exclusive private estates, featuring infinity pools, personalized butler service, master chefs, and unparalleled tranquility.',
    tag: 'Signature Series',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=900',
    query: 'residential',
    property_type: 'resort'
  },
  {
    id: 'wedding-venues',
    label: 'Intimate Wedding & Event Venues',
    subtitle: 'Magical backdrops for your dream celebration',
    detail: 'Say goodbye to Big Fat Weddings, say hello to intimate, curated celebration venues with floral-wrapped courtyards, rooftop terraces & in-house chefs. Available for 50 to 300 guests.',
    tag: 'Trending',
    image: 'https://images.pexels.com/photos/12153938/pexels-photo-12153938.jpeg?auto=compress&cs=tinysrgb&w=900',
    query: 'event_venue',
    property_type: 'banquet_hall'
  },
  {
    id: 'residential-stays',
    label: 'Premium Apartments & Homes',
    subtitle: 'Fully serviced urban homes with hotel-grade amenities',
    detail: 'Monthly or nightly, our premium residential properties come with AC, WiFi, housekeeping & verified hosts. Ideal for business travelers, relocating professionals & long-term stays in metro cities.',
    tag: 'New Launches',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=900',
    query: 'residential',
    property_type: 'apartment'
  },
  {
    id: 'commercial-spaces',
    label: 'Commercial & Co-working Spaces',
    subtitle: 'Premium offices and collaborative work studios',
    detail: 'Short-term or long-term rentals for startups, corporate offsites, and growing teams. Our commercial spaces include boardrooms, co-working zones, event halls & plug-and-play setups.',
    tag: 'Corporate Picks',
    image: 'https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&q=80&w=900',
    query: 'commercial'
  },
  {
    id: 'resort-villas',
    label: 'Resort Villas & Pool Stays',
    subtitle: 'Private resort-style escapes for families and groups',
    detail: 'Scenic villas, pool stays, and weekend resorts near Nashik, Lonavala, Alibaug, Konkan, and Goa with lawns, caretakers, and premium leisure amenities.',
    tag: 'Resort Picks',
    image: '/videos/hero/pexels-roman-odintsov-4870616.jpg',
    query: 'residential',
    property_type: 'villa'
  }
];

const STANDARD_FEATURES = [
  { label: 'Personalised Celebrations', icon: PartyPopper },
  { label: 'Caretaker Onsite', icon: UserCheck },
  { label: 'In-house Chef', icon: ChefHat },
  { label: 'Local Experiences', icon: Compass },
  { label: 'Private Pool', icon: Waves },
  { label: 'Butler Service', icon: ConciergeBell },
  { label: 'Games & Recreation', icon: Gamepad2 },
  { label: 'Green Open Spaces', icon: Trees }
];

/* ====================================================================
   CollectionsSection — Full-bleed, edge-to-edge, Saffron Stay-inspired
   ==================================================================== */
const CollectionsSection = ({ navigate }) => {
  const sliderRef = React.useRef(null);

  const handleCardClick = (col) => {
    if (col.id === 'hilltop-retreats') {
      navigate('/guest/browse?signature=true');
      return;
    }
    const typeQuery = col.property_type ? `&property_type=${col.property_type}` : '';
    navigate(`/guest/browse?category=${col.query}${typeQuery}`);
  };

  const scroll = (dir) => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
    }
  };

  return (
    <section className="w-full bg-white pt-10 md:pt-16 pb-4 md:pb-6 overflow-x-hidden">
      <div className="max-w-[1440px] mx-auto px-4 md:px-[10vw]">
        {/* Header */}
        <ScrollReveal duration="duration-[800ms]">
          <div className="flex items-end justify-between gap-4 mb-8">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-charcoal tracking-tight">
              Discover Our Collection
            </h2>
            {/* Nav arrows aligned with content */}
            <div className="hidden md:flex items-center gap-3 text-charcoal">
              <button
                onClick={() => scroll('left')}
                className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 hover:text-terracotta transition-all duration-300"
                aria-label="Previous collection"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 hover:text-terracotta transition-all duration-300"
                aria-label="Next collection"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </ScrollReveal>

        {/* Bounded Cards Strip */}
        <ScrollReveal duration="duration-[1000ms]" delay={150}>
          <div className="overflow-hidden">
            <div
              ref={sliderRef}
              className="flex overflow-x-auto no-scrollbar gap-5 snap-x scroll-smooth pb-4 justify-start"
            >
              {PREMIUM_COLLECTIONS.map((col) => {
                return (
                  <div
                    key={col.id}
                    onClick={() => handleCardClick(col)}
                    className="relative flex-none snap-start w-[240px] md:w-[300px] aspect-[3/4] overflow-hidden cursor-pointer rounded-2xl group shadow-md hover:shadow-xl transition-all duration-500"
                  >
                    {/* Background Image */}
                    <img
                      src={col.image}
                      alt={col.label}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10 transition-opacity duration-300 group-hover:opacity-90" />

                    {/* Tag badge */}
                    <div className="absolute top-4 left-4 z-10">
                      {col.tag === 'Signature Series' ? (
                        <div className="bg-black border border-[#D4AF37]/50 px-3 py-1 rounded-none shadow-md flex items-center gap-1.5">
                          <Crown className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37]/20" />
                          <span className="text-[#D4AF37] text-[9px] font-extrabold uppercase tracking-[0.15em] font-serif">
                            Signature Series
                          </span>
                        </div>
                      ) : (
                        <span className="bg-white/95 text-charcoal text-[9px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                          {col.tag}
                        </span>
                      )}
                    </div>

                    {/* Card Content - stable and smooth slide-up */}
                    <div className="absolute inset-0 p-5 md:p-6 flex flex-col justify-end z-10">
                      <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest mb-1">Explore</p>
                      <h3 className="text-white text-lg md:text-xl font-bold leading-snug transition-transform duration-500 group-hover:-translate-y-1">
                        {col.label}
                      </h3>
                      
                      {/* Detailed Description */}
                      <div className="max-h-0 opacity-0 overflow-hidden transition-all duration-500 ease-in-out group-hover:max-h-[120px] group-hover:opacity-100 group-hover:mt-2">
                        <p className="text-white/80 text-[11px] md:text-xs leading-relaxed">
                          {col.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
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
  const handleSignOut = () => {
    logout();
    navigate('/');
  };
  const [locationQuery, setLocationQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('residential');

  const [activeDropdown, setActiveDropdown] = useState(null);
  const [guestCounts, setGuestCounts] = useState({ adults: 2, children: 0, infants: 0 });
  const [dates, setDates] = useState({ checkIn: '', checkOut: '' });
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

  const scrollToSlide = (containerId, index) => {
    const container = document.getElementById(containerId);
    if (container && container.children[index]) {
      const child = container.children[index];
      const leftOffset = child.offsetLeft - container.offsetLeft - (window.innerWidth < 768 ? 16 : 32);
      container.scrollTo({ left: leftOffset, behavior: 'smooth' });
    }
  };

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
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
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

  const handleWishlistToggle = (propertyId) => {
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
        const [resRes, resComm, resEvent] = await Promise.all([
          propertyAPI.searchProperties({ category: 'residential', limit: 10, sort: 'rating_desc', _t: cacheBust }),
          propertyAPI.searchProperties({ category: 'commercial', limit: 10, sort: 'rating_desc', _t: cacheBust }),
          propertyAPI.searchProperties({ category: 'event_venue', limit: 10, sort: 'rating_desc', _t: cacheBust })
        ]);

        setProperties({
          residential: resRes.data.properties || [],
          commercial: resComm.data.properties || [],
          event_venue: resEvent.data.properties || []
        });
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
    if (locationQuery.trim()) params.set('city', locationQuery.trim());
    if (totalGuests) params.set('guests', String(totalGuests));
    if (dates.checkIn) params.set('checkIn', dates.checkIn);
    if (dates.checkOut) params.set('checkOut', dates.checkOut);
    if (searchCategory && searchCategory !== 'all') params.set('category', searchCategory);
    navigate(`/guest/browse?${params.toString()}`);
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
        <div className="flex items-end justify-between mb-6 px-4 md:px-[10vw] w-full">
          <div className="text-left">
            <h3 className="text-xl md:text-2xl font-bold tracking-tight text-charcoal flex items-center gap-2">
              <span>{title}</span>
              <IconComponent className="w-5 h-5 text-charcoal/85 stroke-[2]" />
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
        <div className="w-full relative px-4 md:px-[10vw]">
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
                className="bg-transparent cursor-pointer transition-all duration-300 min-w-[240px] md:min-w-[280px] w-[240px] md:w-[280px] snap-start flex flex-col group/card"
              >
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-3">
                  <img 
                    src={item.img || getImageUrl(item.images?.[0]) || PROPERTY_IMAGE_FALLBACK}
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
                  <div className="absolute top-3 right-3 z-20">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleWishlistToggle(item.property_id); }}
                      className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center shadow-sm hover:scale-[1.05] transition cursor-pointer"
                    >
                      <Heart className={`w-4 h-4 ${wishlist.includes(item.property_id) ? 'text-red-500 fill-red-500' : 'text-gray-700'}`} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 flex flex-col px-0.5">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h4 className="font-semibold text-sm md:text-base text-charcoal line-clamp-1 group-hover/card:text-terracotta transition-colors">
                      {item.title}
                    </h4>
                    {item.rating && (
                      <span className="flex items-center text-xs font-semibold text-charcoal shrink-0">
                        <Star className="w-3.5 h-3.5 text-[#eab308] fill-current mr-1" />
                        {item.rating}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-550 text-xs font-medium mb-1">
                    {item.type || item.property_type || 'Property'} in {item.city}
                  </p>
                  
                  <div className="mt-auto flex items-baseline">
                    <span className="font-bold text-sm md:text-base text-charcoal">₹{(item.price || item.price_per_night || 0).toLocaleString('en-IN')}</span>
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

  const faqItems = [
    {
      question: "What is X-Space360 and how does it work?",
      answer: "X-Space360 is a curated premium short-term rental network. We connect property owners (hosts) with guests seeking high-end residential, commercial, or event spaces. All listed spaces undergo a strict coordinate geofencing and physical RM quality audit before going live."
    },
    {
      question: "How can I register my property as a Host?",
      answer: "You can register as a Host from our portal. Upload the required verification documents, our team schedules a physical inspection, and once verified your property gets a green trust badge and goes live."
    },
    {
      question: "What types of properties can I list?",
      answer: "You can list Residential spaces like villas and apartments, Commercial spaces like offices and meeting rooms, and Event Venues like banquet halls, lawns, and rooftops."
    },
    {
      question: "How are guest bookings and payments secured?",
      answer: "We use secure checkout locks and Razorpay payment verification. When a guest reserves, the calendar is temporarily locked to prevent double bookings and payouts are settled through tax-compliant invoice protocols."
    }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-[#2A2A2A] overflow-x-hidden selection:bg-terracotta/20">
      <SEO type="website" seo={cmsContent?.seo} breadcrumbs={[{ name: "Home", url: "/" }]} />
      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 w-full z-50 flex justify-between items-center px-8 md:px-[12vw] h-20 md:h-24 transition-all duration-300 ${
          isNavScrolled
            ? 'bg-white/95 text-charcoal shadow-subtle backdrop-blur-xl border-b border-gray-100'
            : 'bg-transparent text-white'
        }`}
      >
        {/* Left Logo */}
        <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
          <img
            src="/logo.png"
            alt="X-Space360 Logo"
            className={`h-8 md:h-10 w-auto object-contain transition-all duration-300 ${isNavScrolled ? '' : 'logo-white'}`}
          />
        </div>

        {/* Center Menu Links (Flat Style) */}
        <div className={`hidden md:flex items-center space-x-8 font-bold text-xs uppercase tracking-widest transition-colors duration-300 ${isNavScrolled ? 'text-charcoal' : 'text-white/90'}`}>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); navigate('/guest/browse'); }}
            className="hover:text-terracotta transition-colors duration-200"
          >
            Discover
          </a>
          {user && (
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); navigate('/guest/browse?wishlist=true'); }}
              className="hover:text-terracotta transition-colors duration-200 flex items-center gap-1"
            >
              <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 animate-pulse" />
              <span>Wishlist</span>
            </a>
          )}
          <button
            onClick={() => setShowHowItWorksModal(true)}
            className="hover:text-terracotta transition-colors duration-200 uppercase"
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
        </div>

        {/* Right Side Options */}
        <div className="hidden md:flex items-center space-x-4">
          {/* Language Selector */}
          <div className={`backdrop-blur-md px-3 py-1.5 rounded-full border transition-all duration-300 ${isNavScrolled ? 'bg-gray-50 border-gray-200' : 'bg-white/10 border-white/20'}`}>
            <LanguageSelector
              currentLang={lang}
              onLanguageChange={(newLang) => {
                setLang(newLang);
                localStorage.setItem('preferredLanguage', newLang);
              }}
            />
          </div>

          {/* Get in Touch Button */}
          <button 
            onClick={() => navigate('/support')}
            className={`flex items-center gap-2 rounded-full px-5 py-2 transition font-bold text-xs tracking-wider uppercase shadow-sm border ${
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
                className="bg-terracotta hover:bg-terracotta/90 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-full transition shadow-premium"
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
        <div className="md:hidden flex items-center">
          <button onClick={() => setIsMobileMenuOpen(true)} className={`${isNavScrolled ? 'text-charcoal' : 'text-white'} hover:text-terracotta transition p-2`}>
            <Menu className="w-8 h-8 drop-shadow-subtle" />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-charcoal/95 backdrop-blur-xl flex flex-col pt-6 pb-10 px-6 overflow-y-auto animate-fade-in text-white md:hidden">
          <div className="flex justify-between items-center mb-12">
            <div className="cursor-pointer" onClick={() => { setIsMobileMenuOpen(false); navigate('/'); }}>
              <img src="/logo.png" alt="X-Space360 Logo" className="h-8 w-auto object-contain logo-white" />
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-white hover:text-terracotta transition p-2 bg-white/10 rounded-full">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex flex-col space-y-6 flex-1">
            <button
              onClick={() => { setIsMobileMenuOpen(false); navigate('/guest/browse'); }}
              className="text-left text-2xl font-bold hover:text-terracotta transition py-2 border-b border-white/10"
            >
              Discover
            </button>
            <button
              onClick={() => { setIsMobileMenuOpen(false); navigate('/guest/browse?wishlist=true'); }}
              className="text-left text-2xl font-bold hover:text-terracotta transition flex items-center justify-between py-2 border-b border-white/10"
            >
              <span>Wishlist</span>
              <Heart className="w-6 h-6 text-red-500 fill-red-500" />
            </button>
            <button
              onClick={() => { setIsMobileMenuOpen(false); setShowHowItWorksModal(true); }}
              className="text-left text-2xl font-bold hover:text-terracotta transition py-2 border-b border-white/10"
            >
              How It Works
            </button>
            <button
              onClick={() => { setIsMobileMenuOpen(false); navigate(user ? '/host/list-property' : '/register?role=host'); }}
              className="text-left text-2xl font-bold hover:text-terracotta transition py-2 border-b border-white/10"
            >
              List your Property
            </button>
            <button
              onClick={() => { setIsMobileMenuOpen(false); navigate('/support'); }}
              className="text-left text-2xl font-bold text-blue-400 flex items-center gap-2 py-2 border-b border-white/10"
            >
              <Phone className="w-5 h-5" />
              <span>Get in Touch</span>
            </button>
            <div className="py-2 border-b border-white/10 flex items-center justify-between">
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
              <>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); navigate('/dashboard'); }}
                  className="text-left text-2xl font-bold text-terracotta py-2 border-b border-white/10"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); handleSignOut(); }}
                  className="mt-8 bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-xl text-center transition"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }}
                  className="text-left text-2xl font-bold hover:text-terracotta transition py-2 border-b border-white/10"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); navigate('/register?role=host'); }}
                  className="mt-8 bg-terracotta hover:bg-terracotta-hover text-white font-bold py-4 rounded-xl text-center shadow-premium transition"
                >
                  Become a Host
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== PREMIUM SLIDING IMAGE HERO ===== */}
      <section className="relative w-full z-30 bg-white px-4 md:px-[10vw] pt-0 pb-0">
      <div className="relative h-[62vh] min-h-[560px] max-h-[640px] w-full z-30 overflow-visible bg-white shadow-premium">
        
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
              backgroundPosition: 'center',
              opacity: index === currentHeroSlide ? 1 : 0
            }}
          />
        ))}

        {/* ── 35% dark overlay ── */}
        <div className="absolute inset-0 bg-black/35 z-10 transition-opacity duration-1000" />

        {/* ── Dot Slider Indicators ── */}
        <div className="absolute bottom-8 left-0 right-0 z-30 flex justify-center items-center space-x-2 md:space-x-3">
          {heroSlides.map((slide, index) => {
            return (
              <button
                key={index}
                onClick={() => setCurrentHeroSlide(index)}
                className={`w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full transition-all duration-300 shadow-sm ${
                  index === currentHeroSlide 
                    ? `bg-white scale-125` 
                    : 'bg-white/50 hover:bg-white'
                }`}
              />
            );
          })}
        </div>

        {/* ── Hero Content (Centered with Spacing & font-lufga) ── */}
        <div className="relative z-20 max-w-6xl mx-auto px-6 md:px-12 h-full flex flex-col justify-center items-center text-center pt-24 pb-16">
          {(() => {
            const activeHero = heroSlides[currentHeroSlide] || heroSlides[0] || DEFAULT_HERO_SLIDES[0];
            return (
              <div className="flex flex-col items-center space-y-6 w-full animate-fade-in" key={currentHeroSlide}>
                 <span className="text-[9px] md:text-[10px] font-bold tracking-[0.25em] uppercase px-4 py-1.5 rounded-full text-white bg-white/10 backdrop-blur-md border border-white/20 drop-shadow-md">
                    {activeHero.tag}
                 </span>
                 <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-bold leading-[1.25] text-white drop-shadow-premium font-lufga tracking-tight">
                   {activeHero.titlePrefix} {activeHero.titleHighlight} {activeHero.titleSuffix}
                 </h2>
                 
                 {/* Custom Badges / Batches instead of Subtitle */}
                 <div className="flex flex-wrap justify-center gap-2.5">
                   {activeHero.badges && activeHero.badges.map((badge, idx) => (
                     <span key={idx} className="border border-white bg-white/10 backdrop-blur-md rounded-full px-6 py-2 text-white font-bold text-xs md:text-sm drop-shadow-sm select-none">
                       {badge}
                     </span>
                   ))}
                 </div>

                 {/* ── Search Container Embedded Directly inside Hero below Badges ── */}
                 <div className="w-full mt-8 relative max-w-5xl text-left">
                    {/* Transparent overlay to close active dropdowns on clicking outside */}
                    {activeDropdown && (
                      <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActiveDropdown(null)} />
                    )}

                    {/* Capsule Search Bar */}
                    <div className="flex flex-col md:flex-row items-center bg-white rounded-3xl md:rounded-full w-full shadow-elevated border border-sand-200/80 p-2 md:p-3 relative z-50">
                        
                        {/* Location */}
                        <div className="relative flex-1 w-full">
                          <div 
                            onClick={() => {
                              setActiveDropdown('location');
                              const el = document.getElementById('landing-destination');
                              if (el) el.focus();
                            }}
                            className="flex items-center px-4 md:px-6 py-3 w-full cursor-pointer group rounded-3xl md:rounded-full hover:bg-stone/50 transition duration-200"
                          >
                            <MapPin className="w-4.5 h-4.5 text-gray-400 mr-3 group-hover:text-terracotta transition-colors shrink-0" />
                            <div className="w-full text-left">
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">Where</p>
                              <input
                                id="landing-destination"
                                name="destination"
                                type="text"
                                autoComplete="address-level2"
                                value={locationQuery}
                                onFocus={() => setActiveDropdown('location')}
                                onChange={(e) => {
                                  setLocationQuery(e.target.value);
                                  setActiveDropdown('location');
                                }}
                                placeholder="Select Location"
                                className="bg-transparent border-none outline-none text-charcoal w-full placeholder-gray-400 font-extrabold text-sm focus:ring-0 focus:outline-none p-0 mt-1"
                              />
                            </div>
                          </div>

                          {/* Airbnb-style Suggested Destinations Dropdown */}
                          {activeDropdown === 'location' && (
                            <div className="absolute left-0 top-full mt-3 w-80 bg-white border border-gray-100 rounded-3xl shadow-elevated z-50 p-4 max-h-96 overflow-y-auto">
                              <p className="text-xs font-bold tracking-tight text-gray-400 uppercase tracking-wider mb-3 px-2">Suggested destinations</p>
                              <div className="space-y-1">
                                {SUGGESTED_DESTINATIONS.filter(dest => 
                                  !locationQuery || 
                                  dest.city.toLowerCase().includes(locationQuery.toLowerCase()) || 
                                  dest.state.toLowerCase().includes(locationQuery.toLowerCase())
                                ).map((dest, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                      setLocationQuery(dest.city);
                                      setActiveDropdown(null);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-stone transition text-left"
                                  >
                                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                                      {(() => {
                                        const DestIcon = dest.icon || MapPin;
                                        return <DestIcon className="w-5 h-5 text-gray-500" />;
                                      })()}
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-charcoal">{dest.city}, {dest.state}</p>
                                      <p className="text-xs text-gray-400 font-semibold mt-0.5">{dest.desc}</p>
                                    </div>
                                  </button>
                                ))}
                                {SUGGESTED_DESTINATIONS.filter(dest => 
                                  !locationQuery || 
                                  dest.city.toLowerCase().includes(locationQuery.toLowerCase()) || 
                                  dest.state.toLowerCase().includes(locationQuery.toLowerCase())
                                ).length === 0 && (
                                  <p className="text-xs font-semibold text-gray-400 p-2 italic text-center">No locations matched. Press enter to search anyway.</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="hidden md:block w-[1px] h-8 bg-gray-200" />
                        
                        {/* Check-in */}
                        <div className="relative flex items-center px-4 md:px-6 py-3 w-full md:w-auto hover:bg-stone/50 rounded-full transition duration-200 group shrink-0">
                          <Calendar className="w-4.5 h-4.5 text-gray-400 mr-3 group-hover:text-terracotta transition-colors z-0 shrink-0" />
                          <div className="w-full text-left pointer-events-none z-0">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">Check-in</p>
                            <p className={`font-extrabold text-sm mt-1 leading-none ${dates.checkIn ? 'text-charcoal' : 'text-gray-400'}`}>
                              {dates.checkIn || 'Select Date'}
                            </p>
                          </div>
                          <input
                            id="landing-check-in"
                            name="checkIn"
                            type="date"
                            min={todayISO}
                            value={dates.checkIn}
                            onChange={(e) => setDates({ ...dates, checkIn: e.target.value })}
                            onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                        </div>
                        
                        {/* Arrow Separator */}
                        <div className="hidden md:flex items-center text-gray-300 mx-1 shrink-0">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                        
                        {/* Check-out */}
                        <div className="relative flex items-center px-4 md:px-6 py-3 w-full md:w-auto hover:bg-stone/50 rounded-full transition duration-200 group shrink-0">
                          <Calendar className="w-4.5 h-4.5 text-gray-400 mr-3 group-hover:text-terracotta transition-colors z-0 shrink-0" />
                          <div className="w-full text-left pointer-events-none z-0">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">Check-out</p>
                            <p className={`font-extrabold text-sm mt-1 leading-none ${dates.checkOut ? 'text-charcoal' : 'text-gray-400'}`}>
                              {dates.checkOut || 'Select Date'}
                            </p>
                          </div>
                          <input
                            id="landing-check-out"
                            name="checkOut"
                            type="date"
                            min={dates.checkIn || todayISO}
                            value={dates.checkOut}
                            onChange={(e) => setDates({ ...dates, checkOut: e.target.value })}
                            onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                        </div>
                        <div className="hidden md:block w-[1px] h-8 bg-gray-200" />

                        {/* Guests */}
                        <div className="relative flex-1 w-full">
                          <div 
                            onClick={() => setActiveDropdown(activeDropdown === 'guests' ? null : 'guests')}
                            className="flex items-center px-4 md:px-6 py-3 w-full cursor-pointer hover:bg-stone/50 rounded-full transition duration-200 group"
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
                        <div className="w-full md:w-auto p-1 shrink-0">
                          <button
                            onClick={handleSearch}
                            className="w-full md:w-auto bg-[#1A1A1A] hover:bg-black text-white font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-2xl md:rounded-full transition duration-200 shadow-md cursor-pointer"
                          >
                            SEARCH
                          </button>
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
          <div className="px-4 md:px-[10vw]">
            <div className="flex items-center justify-between gap-4 mb-6 md:mb-8">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-charcoal tracking-tight">Pick a Destination</h2>
                <button
                  type="button"
                  onClick={() => setLocationQuery('Nashik')}
                  className="inline-flex items-center gap-1 text-xs md:text-sm font-semibold text-charcoal-muted hover:text-terracotta transition"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Show nearby locations
                </button>
              </div>
              <div className="hidden md:flex items-center gap-3 text-charcoal">
                <ChevronLeft className="w-5 h-5" />
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-x-4 gap-y-8 md:gap-x-8 md:gap-y-10">
              {DESTINATION_SHORTCUTS.map((label, index) => (
                <button
                  key={label}
                  onClick={() => navigate(`/guest/browse?city=${encodeURIComponent(label)}`)}
                  className="group flex flex-col items-center gap-2 cursor-pointer"
                >
                  <div className="flex h-20 md:h-24 items-center justify-center transition-transform duration-300 group-hover:-translate-y-1">
                    <DestinationLineIcon label={label} />
                  </div>
                  <p className="text-charcoal font-medium text-sm md:text-base tracking-tight leading-snug">{label}</p>
                </button>
              ))}
            </div>

            {recentlyVisitedProperties.length > 0 && (
            <div className="mt-12 md:mt-16 pt-8 md:pt-10 border-t border-sand-200">
              <div className="flex items-end justify-between gap-4 mb-6">
                <div className="text-left">
                  <h2 className="font-serif text-2xl md:text-3xl font-bold text-charcoal tracking-tight">Recently Visited</h2>
                  <div className="mt-6 inline-flex flex-col items-start">
                    <span className="text-sm md:text-base font-bold text-charcoal">Properties</span>
                    <span className="mt-2 h-[2px] w-full bg-charcoal" />
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-3 text-charcoal">
                  <span
                    type="button"
                    onClick={() => scrollSlider('left', 'slider-recently-visited')}
                    className="p-1 hover:text-terracotta transition"
                    aria-label="Previous recently visited properties"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </span>
                  <button
                    type="button"
                    onClick={() => scrollSlider('right', 'slider-recently-visited')}
                    className="p-1 hover:text-terracotta transition"
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
                    className="min-w-[260px] md:min-w-[285px] w-[260px] md:w-[285px] bg-white rounded-xl overflow-hidden border border-gray-100 shadow-subtle hover:shadow-elevated transition text-left snap-start"
                  >
                    <div className="relative aspect-[16/10] bg-stone overflow-hidden">
                      <img
                        src={item.img || getImageUrl(item.images?.[0]) || PROPERTY_IMAGE_FALLBACK}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        onError={({ currentTarget }) => {
                          currentTarget.onerror = null;
                          currentTarget.src = PROPERTY_IMAGE_FALLBACK;
                        }}
                        className="w-full h-full object-cover"
                      />
                      {item.rating && (
                        <div className="absolute top-3 left-3 bg-charcoal/70 text-white rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1">
                          <span>{item.rating}</span>
                          <Star className="w-3 h-3 text-[#E0A51B] fill-current" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleWishlistToggle(item.property_id); }}
                        className="absolute top-3 right-3 text-white"
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
          </div>
        </div>
      </ScrollReveal>
      {/* Content Section — full width, overflow guard */}
      <div className="w-full bg-white relative z-20 overflow-x-hidden">

        {/* ===== Discover Our Collections — Full Width ===== */}
        <CollectionsSection navigate={navigate} />

        {/* ===== Brand Comparison Banner ===== */}
        <section className="w-full bg-stone py-8 md:py-12 border-y border-gray-100">
          <div className="max-w-[1440px] mx-auto px-4 md:px-[10vw] text-center">
            <h3 className="font-serif text-lg md:text-xl font-bold text-charcoal mb-6 tracking-tight">
              Compare stays across your favourite brands
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14">
              <img
                src="/images/logos/booking.svg"
                alt="Booking.com"
                className="h-7 md:h-10 object-contain opacity-85 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
              />
              <img
                src="https://www.skyscanner.co.in/images/websites/h_mq.png"
                alt="MakeMyTrip"
                className="h-7 md:h-10 object-contain opacity-85 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
              />
              <img
                src="https://www.skyscanner.co.in/images/websites/d_ct.png"
                alt="Trip.com"
                className="h-7 md:h-10 object-contain opacity-85 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
              />
              <img
                src="https://www.skyscanner.co.in/images/websites/h_xp.png"
                alt="Expedia"
                className="h-7 md:h-10 object-contain opacity-85 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
              />
              <img
                src="https://www.skyscanner.co.in/images/websites/h_hc.png"
                alt="Hotels.com"
                className="h-7 md:h-10 object-contain opacity-85 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
              />
              <img
                src="/images/logos/airbnb.svg"
                alt="Airbnb"
                className="h-7 md:h-10 object-contain opacity-85 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
              />
            </div>
          </div>
        </section>
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
                'https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&q=80&w=1600', // Gourmet chef plating / food
                'https://images.unsplash.com/photo-1536122985607-4fe00b283652?auto=format&fit=crop&q=80&w=1600', // Active Billiards/Snooker play
                'https://images.unsplash.com/photo-1609220136736-443140cffec6?auto=format&fit=crop&q=80&w=1600', // Indian family vacation
                'https://images.unsplash.com/photo-1729605411999-5a1c8972a169?auto=format&fit=crop&q=80&w=1600'  // Private pool
              ];
              const [currentIndex, setCurrentIndex] = useState(0);

              useEffect(() => {
                const interval = setInterval(() => {
                  setCurrentIndex((prev) => (prev + 1) % slides.length);
                }, 5000);
                return () => clearInterval(interval);
              }, [slides.length]);

              return (
                <div className="relative w-full h-[520px] md:h-[600px] overflow-hidden my-12 md:my-16">
                  {/* Sliding Background Images */}
                  {slides.map((slide, idx) => (
                    <div
                      key={idx}
                      className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                        idx === currentIndex ? 'opacity-100 z-0' : 'opacity-0 z-[-1]'
                      }`}
                    >
                      <img
                        src={slide}
                        alt={`X-Space360 Standard ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  
                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-black/45 z-10" />

                  {/* Slider Dots indicators */}
                  <div className="absolute bottom-6 left-8 md:left-12 z-30 flex items-center space-x-2">
                    {slides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          idx === currentIndex 
                            ? 'w-6 bg-white' 
                            : 'w-1.5 bg-white/40 hover:bg-white/80'
                        }`}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>

                  {/* Floating Overlay Card on the right */}
                  <div className="absolute inset-y-0 right-0 w-full md:w-[480px] lg:w-[550px] bg-black/65 backdrop-blur-md flex flex-col justify-center px-8 md:px-12 text-left text-white border-l border-white/10 z-20">
                    <span className="text-amber-400 font-extrabold text-[10px] uppercase tracking-[0.2em] mb-2">
                      Hospitality Reimagined
                    </span>
                    <h3 className="font-lufga text-3xl md:text-4xl font-bold mb-3 tracking-tight text-white leading-tight">
                      The X-Space360 Standard
                    </h3>
                    <p className="text-white/80 text-xs md:text-sm leading-relaxed mb-8">
                      Enjoy our handpicked signature features designed to make every stay effortlessly luxurious, memorable, and unique.
                    </p>

                    {/* Features Grid */}
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                          <Waves className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <h5 className="font-semibold text-sm text-white leading-tight">Private Pool</h5>
                          <p className="text-white/60 text-[10px] mt-0.5">Exclusive access stays</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                          <ChefHat className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <h5 className="font-semibold text-sm text-white leading-tight">In-house Chef</h5>
                          <p className="text-white/60 text-[10px] mt-0.5">Gourmet dining on demand</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                          <ConciergeBell className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <h5 className="font-semibold text-sm text-white leading-tight">Butler Service</h5>
                          <p className="text-white/60 text-[10px] mt-0.5">Personalized assistance</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                          <UserCheck className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <h5 className="font-semibold text-sm text-white leading-tight">Caretaker Onsite</h5>
                          <p className="text-white/60 text-[10px] mt-0.5">24/7 guest support</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                          <Compass className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <h5 className="font-semibold text-sm text-white leading-tight">Local Experiences</h5>
                          <p className="text-white/60 text-[10px] mt-0.5">Curated local guides</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                          <Gamepad2 className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <h5 className="font-semibold text-sm text-white leading-tight">Recreation & Games</h5>
                          <p className="text-white/60 text-[10px] mt-0.5">Indoor & outdoor setups</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                          <Trees className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <h5 className="font-semibold text-sm text-white leading-tight">Green Open Spaces</h5>
                          <p className="text-white/60 text-[10px] mt-0.5">Lush gardens & lawns</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                          <PartyPopper className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <h5 className="font-semibold text-sm text-white leading-tight">Custom Events</h5>
                          <p className="text-white/60 text-[10px] mt-0.5">Bespoke celebrations</p>
                        </div>
                      </div>
                    </div>
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
              'Banquet halls, rooftops, and celebration venues.',
              PartyPopper,
              'event_venue',
              properties.event_venue
            )}
          </ScrollReveal>


          {/* Post Property Free Banner */}
          <ScrollReveal duration="duration-[800ms]">
            <div className="px-4 md:px-[10vw] mb-8 md:mb-12">
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

          {/* Ad Campaign Carousel (Promo & Host) */}
          <ScrollReveal duration="duration-[1000ms]">
            <div className="px-4 md:px-[10vw] mb-12 md:mb-24">
              <div className="relative rounded-[2rem] overflow-hidden shadow-premium h-[300px] md:h-[350px] bg-stone">
                {/* Slide 1: Guest Promo */}
                <div className={`absolute inset-0 flex items-center transition-all duration-700 ${currentPromoSlide === 0 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
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

                {/* Slide 2: Host Campaign */}
                <div className={`absolute inset-0 flex items-center transition-all duration-700 ${currentPromoSlide === 1 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('/images/host_banner_bg.png')` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-charcoal/80 via-charcoal/40 to-transparent" />
                  
                  <div className="relative z-10 w-full px-8 md:px-16 text-left max-w-xl md:max-w-2xl text-white">
                    <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-3 text-white">
                      Ready to Host with Us?
                    </h3>
                    <p className="text-white/95 text-xs md:text-sm font-semibold leading-relaxed mb-6 max-w-md">
                      Join India's most exclusive short-term rental network and turn your premium space into a high-yielding asset.
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                      <button 
                        onClick={() => navigate(user ? '/dashboard' : '/register?role=host')}
                        className="bg-terracotta hover:bg-terracotta/90 text-white font-bold px-8 py-3 rounded-full transition shadow-premium text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 duration-200"
                      >
                        List Your Property
                      </button>
                      <a href="#" className="text-white hover:text-terracotta text-xs font-bold transition-colors duration-300">
                        Learn about our fees →
                      </a>
                    </div>
                  </div>

                  {/* Floating Badge */}
                  <div className="hidden md:flex absolute right-24 top-1/2 -translate-y-1/2 z-10 bg-white text-terracotta px-5 py-3 rounded-2xl shadow-elevated items-center gap-3 border border-sand-200">
                    <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-terracotta" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Free</p>
                      <p className="text-xl font-black text-terracotta tracking-tight leading-none mt-1">3-Mo Trial</p>
                    </div>
                  </div>
                </div>

                {/* Slider Dot Indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                  {[0, 1].map((idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPromoSlide(idx)}
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${currentPromoSlide === idx ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/70'}`}
                    />
                  ))}
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
                <div className="w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-14 xl:px-20 mt-16 mb-24">
                  {/* Split card banner */}
                  <div className="w-full bg-[#E5DFD9] rounded-3xl overflow-hidden shadow-lg flex flex-col md:flex-row h-auto md:h-[380px] mb-16 border border-[#dcd6d0]">
                    {/* Left text area */}
                    <div className="w-full md:w-[45%] p-8 md:p-10 flex flex-col justify-center text-left text-[#3c3732]">
                      <div>
                        <h4 className="font-serif text-xl md:text-2xl font-bold leading-relaxed mb-6">
                          List your home amongst India's <span className="italic font-normal">finest</span> luxury villas. and become part of our prestigious homeowner community...
                        </h4>
                        <ul className="space-y-3.5 text-xs font-semibold text-[#5a544e]">
                          <li className="flex items-center gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8c7b50]" />
                            Trusted by 300+ HNIs, Industrialists, & Celebrities
                          </li>
                          <li className="flex items-center gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8c7b50]" />
                            Earn 40% net margins upon partnering with us
                          </li>
                          <li className="flex items-center gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8c7b50]" />
                            Enhance the warmth and beauty of your Villa
                          </li>
                          <li className="flex items-center gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8c7b50]" />
                            Peace of mind with an end-to-end hospitality operation
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Right single image area with brown/warm overlay */}
                    <div className="w-full md:w-[55%] relative h-[280px] md:h-full overflow-hidden">
                      <img
                        src="https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=1200"
                        alt="Amarah Villa Dining"
                        className="w-full h-full object-cover"
                      />
                      {/* Brown / Warm sepia tint overlay */}
                      <div className="absolute inset-0 bg-[#8c7b50]/15 mix-blend-multiply pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent z-10 pointer-events-none" />

                      {/* Info overlay (bottom-left) */}
                      <div className="absolute bottom-6 left-6 z-20 text-left text-white">
                        <h5 className="font-serif text-lg font-bold leading-tight text-white">Amarah</h5>
                        <p className="text-white/80 text-[10px] uppercase tracking-wider mt-0.5">Assagao, Goa</p>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Signature Properties list */}
                  <div className="w-full text-left relative mt-16">
                    <div className="flex justify-between items-end mb-6">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-lufga text-2xl md:text-3xl font-bold tracking-tight text-charcoal">
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
                      {[
                        {
                          id: 'sig-1',
                          name: 'Udaipur Palace Lakeview Villa',
                          location: 'Udaipur, Rajasthan',
                          price: '₹95,000',
                          img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=800'
                        },
                        {
                          id: 'sig-2',
                          name: 'Goa Beachside Luxury Villa',
                          location: 'Candolim, Goa',
                          price: '₹85,000',
                          img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800'
                        },
                        {
                          id: 'sig-3',
                          name: 'Manali Snowpeaks Celebration Villa',
                          location: 'Manali, Himachal Pradesh',
                          price: '₹70,000',
                          img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800'
                        },
                        {
                          id: 'sig-4',
                          name: 'Alibaug Coconut Orchard Pool Villa',
                          location: 'Alibaug, Maharashtra',
                          price: '₹55,000',
                          img: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&q=80&w=800'
                        },
                        {
                          id: 'sig-5',
                          name: 'Karjat Waterfall Estate',
                          location: 'Karjat, Maharashtra',
                          price: '₹1,20,000',
                          img: 'https://images.unsplash.com/photo-1729605411999-5a1c8972a169?auto=format&fit=crop&q=80&w=800'
                        }
                      ].map((prop) => (
                        <div
                          key={prop.id}
                          className="min-w-[280px] md:min-w-[310px] max-w-[310px] bg-white rounded-3xl overflow-hidden border border-gray-150 shadow-subtle flex-shrink-0 group cursor-pointer"
                        >
                          <div className="relative h-48 md:h-52 overflow-hidden">
                            <img
                              src={prop.img}
                              alt={prop.name}
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
                            <div className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white shadow-sm transition-all duration-300 z-10">
                              <Heart className="w-4 h-4 text-charcoal hover:fill-red-500 hover:text-red-500 transition-colors" />
                            </div>
                          </div>
                          <div className="p-5 text-left">
                            <h4 className="font-bold text-sm text-charcoal truncate mb-1 group-hover:text-amber-600 transition-colors">
                              {prop.name}
                            </h4>
                            <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-wider mb-3">
                              Villa in {prop.location}
                            </p>
                            <div className="flex items-baseline gap-1">
                              <span className="font-black text-sm text-charcoal">{prop.price}</span>
                              <span className="text-[10px] text-gray-500 font-semibold">/ day</span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* View All Card at the end */}
                      <div
                        onClick={() => navigate('/guest/browse?category=Signature')}
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
                  <div key={idx} className="bg-[#FDFCF8] rounded-3xl p-8 border border-sand-200/80 text-left flex flex-col justify-between transition-all duration-300 min-w-[280px] sm:min-w-[320px] md:min-w-[360px] snap-center flex-1 relative hover:border-terracotta/40 hover:shadow-subtle">
                    <span className="absolute top-6 right-8 text-6xl font-serif text-terracotta/15 select-none pointer-events-none">“</span>
                    <div>
                      <div className="flex items-center space-x-1 text-terracotta mb-6">
                        {[...Array(item.stars)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                      <p className="text-charcoal font-serif italic text-base leading-relaxed mb-8 relative z-10">
                        "{item.text}"
                      </p>
                    </div>
                    <div className="flex items-center space-x-4 border-t border-sand-100 pt-4 mt-auto">
                      <img src={item.avatar} alt={item.author} className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <h4 className="font-bold text-charcoal text-xs tracking-tight">{item.author}</h4>
                        <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mt-0.5">{item.role}</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
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
                  className="group cursor-pointer flex flex-col text-left"
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
          <>
          {/* FAQ Section */}
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
          </>
          )}


          
        </div>
      </div>

      {/* Separate FAQ Section */}
      <section className="relative overflow-hidden border-t border-gray-100 bg-[#fbfbfa] text-charcoal py-20 md:py-24">
        <div className="relative z-10 w-full px-6 md:px-10 lg:px-14 xl:px-20 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 gap-10 text-left lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-5">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest leading-none">FAQS</span>
              <h3 className="mt-5 text-3xl md:text-5xl font-black text-charcoal tracking-tight leading-tight">
                Questions people ask before they start.
              </h3>
              <p className="mt-5 max-w-md text-sm md:text-base font-medium leading-relaxed text-charcoal-muted">
                Still need help? Book a 15-minute call with an advisor, no pressure and no commitment.
              </p>
              <button
                onClick={() => navigate('/support')}
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-black px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-premium transition hover:bg-black/90"
              >
                <span>Contact Advisor</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-4 lg:col-span-7">
              {faqItems.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={faq.question}
                    className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="flex w-full items-center justify-between px-5 py-5 text-left text-sm font-bold text-charcoal transition hover:bg-gray-50 md:px-6 md:text-base"
                    >
                      <span>{faq.question}</span>
                      {isOpen ? (
                        <ChevronUp className="ml-4 h-5 w-5 shrink-0 text-amber-500" />
                      ) : (
                        <ChevronDown className="ml-4 h-5 w-5 shrink-0 text-gray-400" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="border-t border-gray-100 px-5 pb-6 pt-4 text-xs font-medium leading-relaxed text-charcoal-muted md:px-6 md:text-sm bg-gray-50/50">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

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
