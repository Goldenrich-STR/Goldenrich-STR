import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Calendar, Star, Search, User, LogOut, CheckCircle2, ShieldCheck, ClipboardList, Sparkles, X, CreditCard, ArrowRight, Home, Briefcase, PartyPopper, Facebook, Instagram, Twitter, Linkedin, Heart, Share2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import apiClient, { propertyAPI, getImageUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ChatbotWidget from '../components/ChatbotWidget';
import LanguageSelector from '../components/LanguageSelector';
import { formatCategoryLabel, formatPropertyTypeLabel } from '../lib/displayLabels';

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
  guests_title: 'For Guests',
  guest_link_1_label: 'Browse Collections',
  guest_link_1_url: '/guest/browse',
  guest_link_2_label: 'FAQs',
  faq_title: 'Frequently Asked Questions',
  faq_items: [
    { question: 'How do I book a property?', answer: 'Browse collections, choose your dates, and submit a booking request from the property page.' },
    { question: 'How do hosts list a space?', answer: 'Hosts can sign in and use List Your Space to submit property details and documents for verification.' },
    { question: 'Who do I contact for support?', answer: 'Use the contact and grievance details in the footer for support or escalation.' },
  ],
  footer_sections: [
    { heading: 'For Guests', items: [
      { label: 'Browse Collections', action_type: 'link', link: '/guest/browse', text: '' },
      { label: 'FAQs', action_type: 'text', link: '', text: 'Browse collections, choose your dates, and submit a booking request from the property page.\n\nHosts can sign in and use List Your Space to submit property details and documents for verification.\n\nFor support or escalation, use the contact details in the footer.' },
    ] },
    { heading: 'For Hosts', items: [
      { label: 'List Your Space', action_type: 'link', link: '/host/list-property', text: '' },
      { label: 'Hosting Standards', action_type: 'link', link: '#how-it-works', text: '' },
    ] },
    { heading: 'Contact', items: [
      { label: 'Nashik, Maharashtra', action_type: 'text', link: '', text: 'X-Space360 support is available for guest and host assistance.\n\nEmail: support@x-space360.com\nPhone: +91 8484826247' },
      { label: 'support@x-space360.com', action_type: 'text', link: '', text: 'Email support@x-space360.com for help with bookings, listings, or account support.' },
    ] },
    { heading: 'Grievance & Escalation', resolution_text: 'Resolution: 7 working days', items: [
      { label: 'Officer: Rahul Mundra', action_type: 'text', link: '', text: 'Grievance Officer: Rahul Mundra\nEmail: nodal.officer@rupiyaloan.com\nPhone: +91 76206 66949\nResolution: 7 working days' },
      { label: 'nodal.officer@rupiyaloan.com', action_type: 'text', link: '', text: 'Email nodal.officer@rupiyaloan.com for grievance escalation.\nResolution: 7 working days.' },
    ] },
  ],
  hosts_title: 'For Hosts',
  host_link_1_label: 'List Your Space',
  host_link_1_url: '/host/list-property',
  host_link_2_label: 'Hosting Standards',
  host_link_2_url: '#how-it-works',
  contact_title: 'Contact',
  grievance_title: 'Grievance & Escalations',
  grievance_officer: 'Rahul Mundra',
  grievance_email: 'nodal.officer@rupiyaloan.com',
  grievance_phone: '+91 76206 66949',
  resolution_text: 'Resolution: 7 working days',
  privacy_label: 'Privacy Policy',
  privacy_text: 'X-Space360 respects your privacy. We collect only the information needed to manage accounts, property listings, bookings, support, verification, and secure platform operations.',
  terms_label: 'Terms & Conditions',
  terms_text: 'By using X-Space360, users agree to follow booking, listing, verification, payment, cancellation, and platform conduct rules published by X-Space360.'
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
      <div className="bg-white rounded-[2.5rem] max-w-5xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-sand-200 flex flex-col relative animate-scale-up">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full bg-sand-100 hover:bg-terracotta hover:text-white flex items-center justify-center transition-all text-charcoal shadow-sm hover:scale-105 active:scale-95"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto p-6 md:p-10 custom-scrollbar w-full h-full flex flex-col">
          {/* Modal Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-terracotta/10 text-terracotta font-extrabold text-[10px] uppercase tracking-[0.2em] mb-4 animate-pulse">
            {t('modalJourney')}
          </span>
          <h3 className="text-3xl md:text-5xl font-black text-charcoal tracking-tight mb-4">
            {t('modalTitle')}
          </h3>
          <p className="text-charcoal-light font-medium text-base md:text-lg leading-relaxed">
            {t('modalDesc')}
          </p>
        </div>

        {/* Interactive Timeline Progress */}
        <div className="relative mb-12 max-w-4xl mx-auto w-full px-4">
          {/* Timeline background line for desktop */}
          <div className="absolute top-[32px] left-[10%] right-[10%] h-[4px] bg-sand-200 z-0 rounded-full"></div>
          
          {/* Active Progress Bar */}
          <div 
            className="absolute top-[32px] left-[10%] h-[4px] bg-gradient-to-r from-terracotta to-sage z-0 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(activeStep - 1) * 20}%` }}
          ></div>

          <div className="grid grid-cols-5 relative z-10">
            {stepsData.map((step) => {
              const IconComponent = step.icon;
              const isActive = activeStep === step.id;
              const isCompleted = activeStep > step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className="flex flex-col items-center group focus:outline-none"
                >
                  <div 
                    className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 transform ${
                      isActive 
                        ? 'bg-terracotta text-white scale-110 ring-4 ring-terracotta/20 animate-pulse'
                        : isCompleted
                        ? 'bg-sage text-white'
                        : 'bg-white border-2 border-sand-300 text-charcoal hover:border-terracotta/50'
                    }`}
                  >
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest mt-3 transition-colors ${
                    isActive ? 'text-terracotta font-black' : 'text-charcoal-muted group-hover:text-charcoal'
                  }`}>
                    {t('step')} {step.id}
                  </span>
                  <span className={`text-[9px] font-bold mt-1 text-center hidden sm:inline-block max-w-[90px] truncate ${
                    isActive ? 'text-terracotta font-black' : 'text-charcoal-muted/70'
                  }`}>
                    {step.shortTitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Step Details Panel with dynamic transitions */}
        <div className="bg-sand-50/70 border border-sand-200/80 rounded-[2rem] p-6 md:p-8 mb-8 grid md:grid-cols-12 gap-8 items-center min-h-[320px] transition-all duration-500 transform">
          
          {/* Left Column: Descriptions */}
          <div className="md:col-span-7 space-y-4 animate-slide-up">
            <span className="inline-block px-3 py-1 rounded-full bg-sage/10 text-sage font-extrabold text-[9px] uppercase tracking-widest">
              {t('activeStage').replace('{stage}', activeStep)}
            </span>
            <h4 className="text-2xl md:text-3xl font-black text-charcoal tracking-tight transition-all duration-300">
              {currentStepData.heading}
            </h4>
            <p className="text-sm font-extrabold text-terracotta italic font-serif">
              {currentStepData.subtitle}
            </p>
            <p className="text-charcoal-light text-sm font-semibold leading-relaxed">
              {currentStepData.paragraph}
            </p>
            
            <div className="space-y-2 pt-2">
              {currentStepData.bullets.map((bullet, idx) => (
                <div key={idx} className="flex items-start space-x-3 text-xs font-bold text-charcoal-muted">
                  <span className="text-terracotta font-black mt-0.5">•</span>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Visual Dashboard Mockup Card */}
          <div className="md:col-span-5 flex justify-center animate-fade-in">
            <div className="bg-white border border-sand-200/80 rounded-2xl p-6 shadow-md w-full max-w-[280px] transform hover:rotate-1 hover:scale-105 transition-all duration-300">
              {activeStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 border-b border-sand-100 pb-3">
                    <div className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center text-sage font-black">
                      U
                    </div>
                    <div>
                      <h6 className="text-xs font-black text-charcoal">{t('hostAccountSetup')}</h6>
                      <p className="text-[9px] text-sage font-bold uppercase tracking-wider">{t('awaitingVerification')}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-6 bg-sand-50 rounded border border-sand-100 flex items-center justify-between px-2.5">
                      <span className="text-[9px] text-charcoal-muted font-bold">{t('aadhaarId')}</span>
                      <span className="text-[8px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-black">{t('uploaded')}</span>
                    </div>
                    <div className="h-6 bg-sand-50 rounded border border-sand-100 flex items-center justify-between px-2.5">
                      <span className="text-[9px] text-charcoal-muted font-bold">{t('smsAuth')}</span>
                      <span className="text-[8px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-black">{t('verified')}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-sand-100 pb-3">
                    <h6 className="text-xs font-black text-charcoal">{t('activePlans')}</h6>
                    <span className="text-[8px] bg-terracotta/10 text-terracotta px-1.5 py-0.5 rounded-full font-black">{t('trialEnabled')}</span>
                  </div>
                  <div className="border border-terracotta bg-terracotta/5 rounded-xl p-3 text-center space-y-1">
                    <p className="text-[9px] text-charcoal-muted font-black uppercase tracking-wider">{t('standardPlan')}</p>
                    <p className="text-lg font-black text-terracotta">₹500 <span className="text-[10px] text-charcoal-muted font-medium">{t('threeMosFree')}</span></p>
                    <div className="w-full bg-terracotta text-white py-1 rounded text-[8px] font-black uppercase tracking-widest mt-2">{t('selected')}</div>
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="space-y-4">
                  <h6 className="text-xs font-black text-charcoal border-b border-sand-100 pb-3">{t('dynamicListingBuilder')}</h6>
                  <div className="space-y-2">
                    <div className="h-3 bg-sand-100 rounded w-3/4"></div>
                    <div className="h-3 bg-sand-100 rounded w-1/2"></div>
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div className="aspect-square bg-sand-100 rounded border border-sand-200 flex items-center justify-center text-[10px] text-charcoal-muted font-black">🏠</div>
                      <div className="aspect-square bg-sand-100 rounded border border-sand-200 flex items-center justify-center text-[10px] text-charcoal-muted font-black">📍</div>
                      <div className="aspect-square bg-sand-100 rounded border border-sand-200 flex items-center justify-center text-[10px] text-charcoal-muted font-black">📸</div>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 border-b border-sand-100 pb-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping"></div>
                    <h6 className="text-xs font-black text-charcoal">{t('rmInspectionScheduled')}</h6>
                  </div>
                  <div className="bg-sand-50 rounded-xl p-3 border border-sand-100 text-center space-y-1">
                    <p className="text-[9px] text-charcoal font-black">{t('rmInspectorName')}</p>
                    <p className="text-[8px] text-charcoal-muted font-bold">{t('coordSync')}</p>
                    <div className="text-[8px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-black inline-block mt-2">{t('auditInProgress')}</div>
                  </div>
                </div>
              )}

              {activeStep === 5 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-sand-100 pb-3">
                    <h6 className="text-xs font-black text-charcoal">{t('payoutSummary')}</h6>
                    <span className="text-[8px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-black">{t('settled')}</span>
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
                    <div className="border-t border-dashed border-sand-200 pt-2 flex justify-between text-xs font-black text-sage">
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
        <div className="grid md:grid-cols-2 gap-8 bg-sand-50 rounded-3xl p-6 md:p-8 mb-8 border border-sand-200">
          <div>
            <h4 className="font-black text-charcoal uppercase tracking-wider text-xs mb-4 flex items-center space-x-2">
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
            <h4 className="font-black text-charcoal uppercase tracking-wider text-xs mb-4 flex items-center space-x-2">
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
              navigate(user ? '/dashboard' : '/register');
            }}
            className="btn-premium px-12 py-4 text-base shadow-lg hover:scale-105 active:scale-95 transition-transform duration-300"
          >
            {user ? t('goHostDashboard') : t('startHostingNow')}
          </button>
        </div>

        </div>
      </div>
    </div>
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
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [footerPopup, setFooterPopup] = useState(null);
  const [cmsContent, setCmsContent] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [activeVideo, setActiveVideo] = useState(0);
  const [prevVideo, setPrevVideo] = useState(null);

  const heroSlides = [
    {
      src: '/videos/hero/pexels-akshay-mr-187831647-12414221.jpg',
      label: 'Luxury Villas with Pools'
    },
    {
      src: '/videos/hero/pexels-shahfaizanfilms-30077915.jpg',
      label: 'Seaside Green Villas'
    },
    {
      src: '/videos/hero/pexels-thevisionaryvows-33485971.jpg',
      label: 'Premium Holiday Stays'
    }
  ];

  React.useEffect(() => {
    const timer = setInterval(() => {
      setActiveVideo(prev => {
        setPrevVideo(prev);
        return (prev + 1) % heroSlides.length;
      });
    }, 6000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const [lang, setLang] = useState(localStorage.getItem('preferredLanguage') || 'en');

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
  const footerFaqItems = Array.isArray(footerData.faq_items) ? footerData.faq_items : DEFAULT_FOOTER_DATA.faq_items;
  const footerSections = (Array.isArray(footerData.footer_sections) && footerData.footer_sections.length
    ? footerData.footer_sections
    : DEFAULT_FOOTER_DATA.footer_sections
  ).slice(0, 4).map((rawSection, index) => {
    const section = rawSection || {};
    return {
      ...section,
      heading: (!section.heading || /^Section\s+\d+$/i.test(section.heading))
        ? ['For Guests', 'For Hosts', 'Contact', 'Grievance & Escalation'][index]
        : section.heading,
      items: Array.isArray(section.items) && section.items.length
        ? section.items.filter(Boolean).map(item => ({
          label: item.label || '',
          action_type: item.action_type || 'link',
          link: item.link || '',
          text: item.text || '',
        }))
        : [{ label: section.label || '', action_type: section.action_type || 'link', link: section.link || '', text: section.text || '' }]
    };
  });

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
    navigate(user ? (footerData.host_link_1_url || '/host/list-property') : '/login');
  };

  const handleFooterSectionClick = (section = {}, item = {}) => {
    if (item.action_type === 'link' && item.link) {
      if (item.link === '/host/list-property') {
        navigate(user ? item.link : '/login');
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
        const [resRes, resComm, resEvent] = await Promise.all([
          propertyAPI.searchProperties({ category: 'residential', limit: 10, sort: 'rating_desc' }),
          propertyAPI.searchProperties({ category: 'commercial', limit: 10, sort: 'rating_desc' }),
          propertyAPI.searchProperties({ category: 'event_venue', limit: 10, sort: 'rating_desc' })
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
    }
  };

  const renderPropertySlider = (sectionId, title, subtitle, IconComponent, categoryKey, items) => {
    const displayItems = items || [];

    return (
      <div className="relative mb-24 group">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 px-8 max-w-7xl mx-auto">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-terracotta/10 flex items-center justify-center mr-4 shrink-0">
              <IconComponent className="w-6 h-6 text-terracotta" />
            </div>
            <div>
              <h3 className="text-[22px] font-black text-charcoal tracking-tight uppercase leading-none mb-1.5">{title}</h3>
              <p className="text-gray-500 text-[13px] font-medium">{subtitle}</p>
            </div>
          </div>
          
          {/* Navigation Arrows */}
          <div className="hidden md:flex space-x-3">
            <button onClick={() => scrollSlider('left', sectionId)} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition text-gray-500 hover:text-charcoal cursor-pointer shadow-sm">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => scrollSlider('right', sectionId)} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition text-gray-500 hover:text-charcoal cursor-pointer shadow-sm">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Slider */}
        <div className="max-w-7xl mx-auto relative">
          <div id={sectionId} className="flex overflow-x-auto pb-10 px-8 gap-6 no-scrollbar snap-x scroll-smooth">
            {displayItems.map((item, index) => (
              <div 
                key={item.property_id || index} 
                onClick={() => navigate(`/property/${item.property_id}`)}
                className="bg-white rounded-[2rem] p-4 cursor-pointer hover:-translate-y-2 transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 min-w-[300px] md:min-w-[340px] snap-center flex flex-col group/card"
              >
                <div className="relative h-[220px] rounded-2xl overflow-hidden mb-5">
                  <img 
                    src={item.img || getImageUrl(item.images?.[0]) || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800'} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover/card:scale-105 transition duration-700" 
                  />
                  {/* Rating Pill */}
                  <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center shadow-sm">
                    <Star className="w-3.5 h-3.5 text-[#eab308] fill-current mr-1.5" />
                    <span className="text-xs font-bold text-gray-800">{item.rating || '4.90'}</span>
                  </div>
                  
                  {/* Right Actions */}
                  <div className="absolute top-4 right-4 flex space-x-2 z-20">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShareWhatsApp(item); }}
                      className="w-9 h-9 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center shadow-sm hover:scale-110 transition cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-gray-600 hover:text-green-600" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleWishlistToggle(item.property_id); }}
                      className="w-9 h-9 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center shadow-sm hover:scale-110 transition cursor-pointer"
                    >
                      <Heart className={`w-4 h-4 ${wishlist.includes(item.property_id) ? 'text-red-500 fill-red-500' : 'text-gray-600 hover:text-terracotta'}`} />
                    </button>
                  </div>

                  {/* Type Pill */}
                  <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md rounded-full px-3 py-1 shadow-sm">
                    <span className="text-[10px] font-bold text-terracotta uppercase tracking-wider">
                      {item.type || item.property_type || 'VILLA'}
                    </span>
                  </div>
                </div>

                <div className="px-1 flex-1 flex flex-col">
                  <h4 className="font-bold text-lg text-charcoal mb-1 line-clamp-1 group-hover/card:text-terracotta transition-colors">{item.title}</h4>
                  <p className="text-gray-500 text-xs font-medium mb-4 flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-terracotta/70" />
                    {item.city}, {item.state || item.city}
                  </p>
                  
                  <div className="mt-auto border-t border-gray-100 pt-4 flex justify-between items-center">
                    <div>
                      <p className="text-terracotta font-black text-xl">₹ {(item.price || item.price_per_night || 0).toLocaleString('en-IN')}</p>
                      <p className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mt-0.5">PER NIGHT</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-sand-50 border border-sand-200 flex items-center justify-center group-hover/card:bg-terracotta group-hover/card:border-terracotta transition-all duration-300 shadow-sm">
                      <Search className="w-4 h-4 text-charcoal group-hover/card:text-white transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* View All Card */}
            <div 
              onClick={() => navigate(`/guest/browse?category=${categoryKey}`)}
              className="min-w-[200px] md:min-w-[240px] border border-dashed border-terracotta/30 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:bg-terracotta/5 hover:border-terracotta/50 transition-all duration-300 snap-center group/viewall"
            >
              <div className="w-14 h-14 rounded-full bg-terracotta/10 flex items-center justify-center mb-4 group-hover/viewall:scale-110 transition-transform">
                <ArrowRight className="w-5 h-5 text-terracotta" />
              </div>
              <span className="font-bold text-charcoal text-sm">View All</span>
              <span className="font-bold text-gray-500 text-xs mt-1">Properties</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] font-sans text-[#2A2A2A] overflow-x-hidden selection:bg-terracotta/20">
      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 w-full z-50 flex justify-between items-center text-white px-6 md:px-12 lg:px-20 h-20">
        {/* Left Logo */}
        <div className="flex items-center">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight cursor-pointer drop-shadow-md text-white hover:text-white/95 transition" onClick={() => navigate('/')}>
            x-space360<span className="text-terracotta">.in</span>
          </h1>
        </div>

        {/* Center Pill Links — Glass Transparent style */}
        <div className="hidden md:flex h-12 items-center px-8 space-x-6 font-semibold text-[11px] uppercase tracking-widest text-white/95 bg-white/10 backdrop-blur-md border border-white/20 rounded-full shadow-lg self-center">
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
          <button
            onClick={() => setShowHowItWorksModal(true)}
            className="hover:text-terracotta transition"
          >
            How It Works
          </button>
          <div className="w-[1px] h-4 bg-white/20" />
          <LanguageSelector
            currentLang={lang}
            onLanguageChange={(newLang) => {
              setLang(newLang);
              localStorage.setItem('preferredLanguage', newLang);
            }}
          />
          <div className="w-[1px] h-4 bg-white/20" />
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
                className="bg-terracotta hover:bg-terracotta-hover text-white px-4 py-1.5 rounded-full transition shadow-md"
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
                className="bg-terracotta hover:bg-terracotta-hover text-white px-4 py-1.5 rounded-full transition shadow-md"
              >
                Get Started
              </button>
            </>
          )}
        </div>

        {/* Right — Get the app */}
        <div className="flex items-center">
          <button onClick={() => navigate('/login')} className="hidden md:flex items-center space-x-2 border border-white/50 rounded-full px-5 py-2 hover:bg-white/20 transition backdrop-blur-sm shadow-sm text-white">
            <span className="text-xs font-semibold uppercase tracking-widest">Get the app</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* ===== PREMIUM VIDEO SLIDER HERO ===== */}
      <style>{`
        @keyframes kenburns {
          0%   { transform: scale(1)    translate(0%, 0%); }
          100% { transform: scale(1.12) translate(-2%, -2%); }
        }
        .hero-video-active  { opacity: 1; animation: kenburns 7s ease-out forwards; }
        .hero-video-exiting { opacity: 0; transition: opacity 1.2s ease; }
        .hero-video-hidden  { opacity: 0; }
        .hero-video-wrap    { transition: opacity 1.2s ease; }
      `}</style>

      <div className="relative h-screen w-full overflow-hidden">

        {/* ── Video layers (Now Images) ── */}
        {heroSlides.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 w-full h-full hero-video-wrap ${
              idx === activeVideo
                ? 'hero-video-active z-10'
                : idx === prevVideo
                ? 'hero-video-exiting z-[9]'
                : 'hero-video-hidden z-0'
            }`}
            style={{
              backgroundImage: `url(${slide.src})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
          </div>
        ))}

        {/* ── 50% dark overlay ── */}
        <div className="absolute inset-0 bg-black/50 z-20" />

        {/* ── Solid Bottom Divider Strip ── */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-[#FDFCF8] border-t border-sand-200/40 z-20" />

        {/* ── Hero Content ── */}
        <div className="relative z-30 max-w-7xl mx-auto px-6 md:px-12 lg:px-20 h-full flex flex-col justify-center pt-24 pb-12 text-left">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end w-full">
            {/* Left side: Heading & Search Bar */}
            <div className="lg:col-span-12 flex flex-col items-start w-full">
              {/* Slide label pill */}
              <div className="mb-6 inline-flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-2 text-white/80 text-xs font-semibold tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-terracotta mr-2.5 animate-pulse"></span>
                {heroSlides[activeVideo]?.label}
              </div>

              {/* Headline */}
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-white drop-shadow-xl max-w-2xl">
                Explore your place<br />
                to stay
              </h2>

              {/* ── Search Bar ── */}
              <div className="mt-8 w-full max-w-5xl">
                {/* Outer Dark Container */}
                <div className="bg-slate-900/60 backdrop-blur-md p-2 md:p-3 rounded-3xl md:rounded-full shadow-2xl border border-white/10">
                  {/* Inner White Container */}
                  <div className="flex flex-col md:flex-row items-center bg-white rounded-2xl md:rounded-full w-full">
                    
                    {/* Location */}
                    <div className="flex items-center px-4 md:px-6 py-4 w-full md:flex-1 cursor-pointer rounded-t-2xl md:rounded-l-full hover:bg-gray-50 transition">
                      <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                      <div className="w-full">
                        <input
                          id="landing-destination"
                          name="destination"
                          type="text"
                          autoComplete="address-level2"
                          value={locationQuery}
                          onChange={(e) => setLocationQuery(e.target.value)}
                          placeholder="Location, project or developer"
                          className="bg-transparent border-none outline-none text-charcoal w-full placeholder-gray-400 font-medium text-sm focus:ring-0 focus:outline-none p-0"
                        />
                      </div>
                    </div>
                    <div className="hidden md:block w-[1px] h-8 bg-gray-200" />
                    
                    {/* Check-in */}
                    <div className="flex items-center px-4 md:px-6 py-4 w-full md:w-auto cursor-pointer hover:bg-gray-50 transition">
                      <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                      <div className="w-full">
                        <input
                          id="landing-check-in"
                          name="checkIn"
                          type={dates.checkIn ? "date" : "text"}
                          onFocus={(e) => e.target.type = 'date'}
                          onBlur={(e) => { if(!e.target.value) e.target.type = 'text' }}
                          placeholder="Add dates"
                          min={todayISO}
                          value={dates.checkIn}
                          onChange={(e) => setDates({ ...dates, checkIn: e.target.value })}
                          className="bg-transparent border-none outline-none text-charcoal font-medium text-sm focus:ring-0 focus:outline-none p-0 w-full md:w-32 [color-scheme:light] placeholder-gray-400"
                        />
                      </div>
                    </div>
                    <div className="hidden md:block w-[1px] h-8 bg-gray-200" />
                    
                    {/* Check-out */}
                    <div className="flex items-center px-4 md:px-6 py-4 w-full md:w-auto cursor-pointer hover:bg-gray-50 transition">
                      <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                      <div className="w-full">
                        <input
                          id="landing-check-out"
                          name="checkOut"
                          type={dates.checkOut ? "date" : "text"}
                          onFocus={(e) => e.target.type = 'date'}
                          onBlur={(e) => { if(!e.target.value) e.target.type = 'text' }}
                          placeholder="Add dates"
                          min={dates.checkIn || todayISO}
                          value={dates.checkOut}
                          onChange={(e) => setDates({ ...dates, checkOut: e.target.value })}
                          className="bg-transparent border-none outline-none text-charcoal font-medium text-sm focus:ring-0 focus:outline-none p-0 w-full md:w-32 [color-scheme:light] placeholder-gray-400"
                        />
                      </div>
                    </div>
                    <div className="hidden md:block w-[1px] h-8 bg-gray-200" />
                    
                    {/* Guests */}
                    <div className="flex items-center px-4 md:px-6 py-4 w-full md:w-auto cursor-pointer hover:bg-gray-50 transition">
                      <User className="w-5 h-5 text-gray-400 mr-3" />
                      <div className="flex items-center gap-1">
                        <input
                          id="landing-guests"
                          name="guests"
                          type="number"
                          min="1"
                          value={guestCounts.adults}
                          onChange={(e) => setGuestCounts({ ...guestCounts, adults: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="bg-transparent border-none outline-none text-charcoal font-medium text-sm focus:ring-0 focus:outline-none p-0 w-10 text-gray-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-gray-500 font-medium text-sm">Guest{guestCounts.adults > 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    
                    {/* Search Button */}
                    <div className="p-2 w-full md:w-auto">
                      <button
                        onClick={handleSearch}
                        className="w-full md:w-auto bg-terracotta hover:bg-terracotta/90 text-white py-3 md:py-4 md:px-8 rounded-xl md:rounded-full transition-all duration-300 flex items-center justify-center shadow-md"
                      >
                        <Search className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>


          </div>



          {/* ── Dot indicators ── */}
          <div className="flex items-center space-x-2 mt-8">
            {heroSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => { setPrevVideo(activeVideo); setActiveVideo(idx); }}
                className={`rounded-full transition-all duration-500 ${
                  idx === activeVideo
                    ? 'w-8 h-2 bg-white'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Category Shortcut Strip ── */}
      <div className="w-full bg-[#FDFCF8] relative z-20 py-12 border-b border-sand-100">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-center gap-10 md:gap-20">
            {[
              {
                label: 'Residential',
                icon: Home,
                category: 'residential',
                desc: 'Homes & Villas',
                bg: 'bg-terracotta',
                ring: 'ring-terracotta/20',
                shadow: 'shadow-terracotta/30'
              },
              {
                label: 'Commercial',
                icon: Briefcase,
                category: 'commercial',
                desc: 'Offices & Co-working',
                bg: 'bg-[#4a3f35]',
                ring: 'ring-[#4a3f35]/20',
                shadow: 'shadow-[#4a3f35]/20'
              },
              {
                label: 'Event Venue',
                icon: PartyPopper,
                category: 'event_venue',
                desc: 'Halls & Rooftops',
                bg: 'bg-[#4a6b50]',
                ring: 'ring-[#4a6b50]/20',
                shadow: 'shadow-[#4a6b50]/20'
              }
            ].map(({ label, icon: Icon, category, desc, bg, ring, shadow }) => (
              <button
                key={category}
                onClick={() => navigate(`/guest/browse?category=${category}`)}
                className="group flex flex-col items-center gap-3 cursor-pointer"
              >
                <div className={`w-20 h-20 rounded-full ${bg} flex items-center justify-center ring-4 ${ring} shadow-xl ${shadow} group-hover:scale-110 group-hover:shadow-2xl transition-all duration-300 active:scale-95`}>
                  <Icon className="w-9 h-9 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-charcoal font-black text-[14px] tracking-tight">{label}</p>
                  <p className="text-gray-400 text-[11px] font-medium mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="w-full bg-[#FDFCF8] relative z-20 pb-32 pt-14">
        <div className="max-w-7xl mx-auto px-8">
          {/* Residential Collection Slider */}
          {renderPropertySlider(
            'slider-residential',
            'Residential Collection',
            'Luxury homes, apartments, and private stays.',
            Building2,
            'residential',
            properties.residential
          )}

          {/* Commercial Spaces Slider */}
          {renderPropertySlider(
            'slider-commercial',
            'Commercial Spaces',
            'Premium offices, co-working spaces, and retail.',
            Briefcase,
            'commercial',
            properties.commercial
          )}

          {/* Events & Functions Slider */}
          {renderPropertySlider(
            'slider-events',
            'Events & Functions',
            'Banquet halls, rooftops, and celebration venues.',
            PartyPopper,
            'event_venue',
            properties.event_venue
          )}

          {/* Ready to Host Section */}
          <div className="bg-[#1a1a1a] rounded-[2.5rem] p-12 md:p-16 text-center text-white mb-32 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-terracotta/10 rounded-full blur-3xl -mr-28 -mt-28"></div>
            <div className="relative z-10 max-w-3xl mx-auto">
              <h3 
                className="text-4xl md:text-5xl font-black mb-6 leading-tight tracking-tight"
                dangerouslySetInnerHTML={{ __html: t('readyToHost') }}
              />
              <p className="text-gray-300 text-base md:text-lg font-medium leading-relaxed mb-10 max-w-2xl mx-auto">
                {t('ctaParagraph')}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <button 
                  onClick={() => navigate(user ? '/dashboard' : '/register')}
                  className="bg-terracotta hover:bg-terracotta-hover text-white font-bold px-8 py-4 rounded-full transition shadow-lg w-full sm:w-auto text-sm uppercase tracking-wider"
                >
                  {t('listProperty')}
                </button>
                <a href="#" className="text-white hover:text-terracotta font-bold text-sm transition-colors duration-300">
                  {t('learnFees')}
                </a>
              </div>
            </div>
          </div>

          {/* Testimonials (Loved by Guests & Hosts) */}
          <div className="mb-32 text-center">
            <span className="text-xs font-black tracking-[0.2em] text-terracotta uppercase">{t('guestStories')}</span>
            <h3 className="text-4xl font-bold text-charcoal mt-3 mb-4 tracking-tight">{t('lovedByGuests')}</h3>
            <p className="text-gray-505 text-gray-500 font-medium max-w-xl mx-auto mb-16">{t('testimonialsSub')}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
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
              ].map((item, idx) => (
                <div key={idx} className="bg-white rounded-[2rem] p-8 border border-sand-200/50 shadow-md text-left flex flex-col justify-between hover:shadow-xl transition-all duration-300">
                  <div>
                    <div className="flex items-center space-x-1 text-amber-500 mb-6">
                      {[...Array(item.stars)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <p className="text-charcoal-light italic font-medium leading-relaxed mb-8">
                      "{item.text}"
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <img src={item.avatar} alt={item.author} className="w-12 h-12 rounded-full object-cover" />
                    <div>
                      <h4 className="font-bold text-charcoal text-sm">{item.author}</h4>
                      <p className="text-gray-400 text-xs font-semibold">{item.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blogs Section (Our Journal) */}
          <div className="mb-32 text-center">
            <span className="text-xs font-black tracking-[0.2em] text-terracotta uppercase">{t('ourJournal')}</span>
            <h3 className="text-4xl font-bold text-charcoal mt-3 mb-4 tracking-tight">{t('latestBlog')}</h3>
            <p className="text-gray-500 font-medium max-w-xl mx-auto mb-16">{t('blogSub')}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              {[
                {
                  id: 'p1',
                  title: 'The Future of Short-Term Rentals in India',
                  excerpt: 'How shifting preferences and hybrid work models are driving growth in STR spaces.',
                  date: 'June 10, 2026',
                  author: 'Amit Sharma',
                  img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800'
                },
                {
                  id: 'p2',
                  title: 'Design Tips to Maximize Your Property Yield',
                  excerpt: 'Curate your space to appeal to high-end travelers with styling and amenity upgrades.',
                  date: 'June 05, 2026',
                  author: 'Neha Patel',
                  img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800'
                },
                {
                  id: 'p3',
                  title: 'Top 5 Weekend Escapes Near Mumbai & Nashik',
                  excerpt: 'Explore the most beautiful villa retreats and holiday home collections for your next vacation.',
                  date: 'May 28, 2026',
                  author: 'Vikram Singh',
                  img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800'
                }
              ].map((post) => (
                <div 
                  key={post.id} 
                  onClick={() => setSelectedPost({
                    id: post.id,
                    title: post.title,
                    excerpt: post.excerpt,
                    date: post.date,
                    author: post.author,
                    image_url: post.img,
                    read_time: '5 min read'
                  })}
                  className="bg-white rounded-[2rem] overflow-hidden border border-sand-200/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full"
                >
                  <div className="h-48 overflow-hidden relative">
                    <img src={post.img} alt={post.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black text-terracotta uppercase tracking-wider">{post.date}</span>
                      <h4 className="font-bold text-lg text-charcoal mt-2 mb-3 leading-snug hover:text-terracotta transition-colors line-clamp-2">{post.title}</h4>
                      <p className="text-gray-500 text-sm font-medium leading-relaxed line-clamp-2 mb-4">{post.excerpt}</p>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-sand-100">
                      <span className="text-xs font-bold text-charcoal-muted">By {post.author}</span>
                      <span className="text-xs font-black text-terracotta uppercase tracking-wider">{t('readArticle')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          
        </div>
      </div>

<footer className="bg-white border-t border-sand-200 pt-16 md:pt-20 pb-12">
        <div className="w-full px-6 md:px-10 xl:px-16 2xl:px-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))] gap-x-10 xl:gap-x-16 2xl:gap-x-20 gap-y-12 mb-16">
            <div>
              <div 
                className="flex items-center space-x-3 mb-8 cursor-pointer group"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                <span className="text-2xl font-black text-charcoal tracking-tight group-hover:text-terracotta transition-colors">
                  x-space360<span className="text-terracotta">.in</span>
                </span>
              </div>
              <p className="text-charcoal-light text-lg mb-8 max-w-md leading-relaxed">
                {footerData.brand_description || t('footerSub')}
              </p>
              <div className="flex space-x-4">
                 <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-sand-100 flex items-center justify-center text-charcoal-muted hover:bg-terracotta hover:text-white transition-all cursor-pointer">
                    <Facebook className="w-4 h-4" />
                 </a>
                 <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-sand-100 flex items-center justify-center text-charcoal-muted hover:bg-terracotta hover:text-white transition-all cursor-pointer">
                    <Instagram className="w-4 h-4" />
                 </a>
                 <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-sand-100 flex items-center justify-center text-charcoal-muted hover:bg-terracotta hover:text-white transition-all cursor-pointer">
                    <Twitter className="w-4 h-4" />
                 </a>
                 <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-sand-100 flex items-center justify-center text-charcoal-muted hover:bg-terracotta hover:text-white transition-all cursor-pointer">
                    <Linkedin className="w-4 h-4" />
                 </a>
              </div>
            </div>
            {footerSections.map((section, index) => (
              <div key={`${section.heading}-${index}`} className="min-w-0">
                <h5 className="font-black text-charcoal uppercase tracking-[0.18em] text-xs mb-8 leading-snug">{section.heading || `Section ${index + 1}`}</h5>
                <ul className="space-y-4">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex}>
                      {index < 2 ? (
                        <button
                          type="button"
                          onClick={() => handleFooterSectionClick(section, item)}
                          className="text-left text-charcoal-light font-medium hover:text-terracotta transition-colors leading-relaxed break-words"
                        >
                          {item.label || 'Footer Link'}
                        </button>
                      ) : (
                        <p className="text-charcoal-light font-medium leading-relaxed break-words">
                          {item.label || item.text || 'Footer Text'}
                        </p>
                      )}
                    </li>
                  ))}
                  {index === 3 && (section.resolution_text || footerData.resolution_text) && (
                    <li>
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-charcoal-muted leading-relaxed">
                        {section.resolution_text || footerData.resolution_text}
                      </p>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-12 border-t border-sand-200 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-charcoal-muted font-bold text-sm tracking-wide uppercase">{t('precision')}</p>
            <div className="flex space-x-8 text-sm font-bold text-charcoal-muted uppercase tracking-widest">
               <button type="button" onClick={() => setFooterPopup({ title: footerData.privacy_label || 'Privacy Policy', text: footerData.privacy_text || DEFAULT_FOOTER_DATA.privacy_text })} className="hover:text-terracotta">
                 {footerData.privacy_label || 'Privacy Policy'}
               </button>
               <button type="button" onClick={() => setFooterPopup({ title: footerData.terms_label || 'Terms & Conditions', text: footerData.terms_text || DEFAULT_FOOTER_DATA.terms_text })} className="hover:text-terracotta">
                 {footerData.terms_label || 'Terms & Conditions'}
               </button>
            </div>
          </div>
        </div>
      </footer>

      {showFaqModal && (
        <div className="fixed inset-0 z-[120] bg-charcoal/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-sand-200 w-full max-w-2xl max-h-[85vh] overflow-y-auto p-7 md:p-9 animate-scale-in">
            <div className="flex items-start justify-between gap-6 mb-7">
              <div>
                <h3 className="text-2xl font-black text-charcoal">{footerData.faq_title || 'Frequently Asked Questions'}</h3>
                <p className="text-sm text-charcoal-muted mt-1">Quick answers for guests and hosts.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowFaqModal(false)}
                className="w-10 h-10 rounded-full border border-sand-200 text-charcoal-muted hover:text-charcoal hover:bg-sand-50 transition flex items-center justify-center"
                aria-label="Close FAQs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {footerFaqItems.map((item, index) => (
                <div key={index} className="rounded-2xl border border-sand-200 bg-sand-50/60 p-5">
                  <h4 className="font-black text-charcoal mb-2">{item.question || `Question ${index + 1}`}</h4>
                  <p className="text-sm text-charcoal-light leading-relaxed">{item.answer || 'Answer coming soon.'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {footerPopup && (
        <div className="fixed inset-0 z-[120] bg-charcoal/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-sand-200 w-full max-w-xl max-h-[85vh] overflow-y-auto p-7 md:p-9 animate-scale-in">
            <div className="flex items-start justify-between gap-6 mb-6">
              <h3 className="text-2xl font-black text-charcoal">{footerPopup.title}</h3>
              <button
                type="button"
                onClick={() => setFooterPopup(null)}
                className="w-10 h-10 rounded-full border border-sand-200 text-charcoal-muted hover:text-charcoal hover:bg-sand-50 transition flex items-center justify-center"
                aria-label="Close footer details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-charcoal-light leading-relaxed whitespace-pre-line">{footerPopup.text}</p>
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
                  className="bg-white rounded-[2.5rem] max-w-5xl w-full max-h-[85vh] md:max-h-[80vh] overflow-hidden shadow-2xl border border-sand-200 flex flex-col md:flex-row relative animate-scale-up" 
                  onClick={(e) => e.stopPropagation()}
                >
                  
                  {/* Left Column: Image Banner (Desktop) / Top Banner (Mobile) */}
                  <div className="relative w-full md:w-[42%] h-[240px] md:h-auto overflow-hidden bg-charcoal-deep shrink-0">
                    <img 
                      src={getImageUrl(selectedPost.image_url)} 
                      alt={selectedPost.title} 
                      className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105"
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-charcoal-deep/90 via-charcoal-deep/40 to-transparent z-10"></div>
                    
                    {/* Floating Info inside Image Column */}
                    <div className="absolute bottom-6 left-6 right-6 z-20 text-white">
                      <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-white mb-3 shadow-sm">
                        {selectedPost.read_time || '5 min read'}
                      </span>
                      <h4 className="text-lg md:text-xl font-black font-serif italic text-sand-100 leading-tight">
                        "Curated perspectives on short-term rentals and spaces."
                      </h4>
                    </div>
                  </div>

                  {/* Right Column: Article Details & Content */}
                  <div className="flex-1 flex flex-col min-w-0 relative h-[calc(85vh-240px)] md:h-auto">
                    
                    {/* Header Controls */}
                    <div className="flex items-center justify-between p-6 md:p-8 pb-4 border-b border-sand-100">
                      {/* Date & Tagline */}
                      <div className="flex items-center space-x-2 text-xs font-black text-terracotta uppercase tracking-[0.2em]">
                        <span>{t('ourJournal')}</span>
                        <span className="text-charcoal-muted font-normal">•</span>
                        <span className="text-charcoal-muted">{selectedPost.date}</span>
                      </div>
                      
                      {/* Close Button inside header controls */}
                      <button
                        onClick={() => setSelectedPost(null)}
                        className="w-10 h-10 rounded-full bg-sand-100 hover:bg-terracotta hover:text-white flex items-center justify-center transition-all text-charcoal shadow-sm hover:scale-105 active:scale-95"
                        title="Close article"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Scrollable Article Text */}
                    <div className="overflow-y-auto px-6 md:px-8 py-6 custom-scrollbar flex-1 space-y-6">
                      
                      {/* Title */}
                      <h3 className="text-2xl md:text-3xl font-black text-charcoal tracking-tight leading-tight">
                        {selectedPost.title}
                      </h3>

                      {/* Author Info */}
                      <div className="flex items-center space-x-3 bg-sand-50/70 border border-sand-200/50 rounded-2xl p-4">
                        <div className="w-10 h-10 rounded-full bg-sage text-white flex items-center justify-center text-sm font-black shadow-sm shrink-0">
                          {selectedPost.author?.[0] || 'A'}
                        </div>
                        <div>
                          <p className="text-sm font-black text-charcoal leading-tight">{selectedPost.author}</p>
                          <p className="text-[11px] text-charcoal-muted font-bold uppercase tracking-wider mt-0.5">X-Space360 Editorial Desk</p>
                        </div>
                      </div>

                      {/* Article Paragraphs */}
                      <div className="text-charcoal-light font-semibold text-sm md:text-base leading-relaxed space-y-5">
                        {selectedPost.id === 'p1' ? (
                          <>
                            <p className="first-letter:text-5xl first-letter:font-black first-letter:text-terracotta first-letter:mr-3 first-letter:float-left">
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
                            <p className="first-letter:text-5xl first-letter:font-black first-letter:text-terracotta first-letter:mr-3 first-letter:float-left">
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
                            <p className="first-letter:text-5xl first-letter:font-black first-letter:text-terracotta first-letter:mr-3 first-letter:float-left">
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
      {/* Floating Scroll Buttons */}
      <div className="fixed top-1/2 -translate-y-1/2 right-8 flex flex-col space-y-3 z-50">
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center shadow-lg hover:bg-white/70 hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-white/20"
          title="Scroll to Top"
        >
          <ChevronUp className="w-5 h-5 text-charcoal" />
        </button>
        <button 
          onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
          className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center shadow-lg hover:bg-white/70 hover:translate-y-1 transition-all duration-300 cursor-pointer border border-white/20"
          title="Scroll to Bottom"
        >
          <ChevronDown className="w-5 h-5 text-charcoal" />
        </button>
      </div>
    </div>
  );
};

export default LandingPage;
