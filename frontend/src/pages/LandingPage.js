import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Calendar, Star, Search, User, LogOut, CheckCircle2, ShieldCheck, ClipboardList, Sparkles, X, CreditCard, ArrowRight, Home, Briefcase, PartyPopper, Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';
import apiClient, { propertyAPI, getImageUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ChatbotWidget from '../components/ChatbotWidget';
import LanguageSelector from '../components/LanguageSelector';

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
    testimonialsSub: 'Hear from our community members about their experience with Golden Rich Stay.',
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
    precision: '© 2026 · All Rights Reserved · Mayur More',
    modalJourney: 'Interactive Host Onboarding Journey',
    modalTitle: 'How It Works: Step-by-Step',
    modalDesc: 'Golden Rich Stay provides a fully integrated, premium, physically verified short-term renting system. Click on the steps below to explore our interactive host pipeline.',
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
    precision: '© 2026 · सर्वाधिकार सुरक्षित · मयूर मोरे',
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
    testimonialsSub: 'आमच्या कम्युनिटी सदस्यांकडून त्यांच्या Golden Rich Stay सोबतच्या अनुभवांबद्दल जाणून घ्या.',
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
    payoutSystem: 'पेआउट प्रणाली',
    contact: 'संपर्क',
    mumbaiHQ: 'नाशिक, महाराष्ट्र',
    privacy: 'गोपनीयता',
    terms: 'अटी आणि शर्ती',
    cookies: 'कुकीज',
    precision: '© 2026 · सर्व हक्क राखीव · मयूर मोरे',
    modalJourney: 'इंटरएक्टिव्ह होस्ट ऑनबोर्डिंग प्रवास',
    modalTitle: 'हे कसे कार्य करते: पायरी-दर-पायरी',
    modalDesc: 'Golden Rich Stay एक पूर्णतः एकात्मिक, premium, प्रत्यक्ष सत्यापित शॉर्ट-टर्म रेंटिंग प्रणाली प्रदान करते. आमच्या परस्परसंवादी होस्ट पाइपलाइनचा शोध घेण्यासाठी खालील पायऱ्यांवर क्लिक करा.',
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
  const [cmsContent, setCmsContent] = useState(null);

  const [lang, setLang] = useState(localStorage.getItem('preferredLanguage') || 'en');

  const t = (key) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en']?.[key] || key;
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
          propertyAPI.searchProperties({ category: 'residential', limit: 6, sort: 'rating_desc' }),
          propertyAPI.searchProperties({ category: 'commercial', limit: 6, sort: 'rating_desc' }),
          propertyAPI.searchProperties({ category: 'event_venue', limit: 6, sort: 'rating_desc' })
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
    navigate(`/guest/browse?city=${locationQuery}&guests=${totalGuests}&checkIn=${dates.checkIn}&checkOut=${dates.checkOut}`);
  };

  const LOCATIONS = [
    { name: 'Goa', img: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=100' },
    { name: 'Delhi', img: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=100' },
    { name: 'Nainital', img: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=100' },
    { name: 'Gurugram', img: 'https://images.unsplash.com/photo-1616843413587-9e3a37f7bbd8?w=100' },
    { name: 'Bengaluru', img: 'https://images.unsplash.com/photo-1596761303554-17ec789178d5?w=100' },
  ];


  return (
    <div className="min-h-screen bg-sand-50 selection:bg-terracotta selection:text-white overflow-x-hidden">

      {/* Header */}
      <header className="glass sticky top-0 z-50 px-4 md:px-8 py-4 shadow-glass transition-all duration-300">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div 
            className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group shrink-0" 
            onClick={() => navigate('/')}
          >

            <img 
              src="/logo.png" 
              alt="Golden Rich Stay Logo" 
              className="w-8 h-8 md:w-12 md:h-12 object-contain transition-transform duration-300 group-hover:scale-110"
            />
            <h1 className="text-sm sm:text-lg md:text-2xl font-black text-charcoal tracking-tighter whitespace-nowrap">
              GOLDEN <span className="text-terracotta">RICH</span> STAY
            </h1>
          </div>
          
          <div className="flex items-center space-x-4 md:space-x-8">
            <nav className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => navigate('/guest/browse')}
                className="text-charcoal-light hover:text-terracotta font-bold text-sm uppercase tracking-widest transition-colors"
              >
                {t('discover')}
              </button>
              <button 
                onClick={() => setShowHowItWorksModal(true)}
                className="text-charcoal-light hover:text-terracotta font-bold text-sm uppercase tracking-widest transition-colors"
              >
                {t('howItWorks')}
              </button>
            </nav>

            {/* Language Selector */}
            <div className="relative flex items-center">
              <LanguageSelector
                currentLang={lang}
                onLanguageChange={(newLang) => {
                  setLang(newLang);
                  localStorage.setItem('preferredLanguage', newLang);
                }}
              />
            </div>

            <div className="h-4 w-[1px] bg-sand-300 hidden md:block"></div>

            {/* Desktop Auth Section */}
            <div className="hidden md:flex items-center space-x-6">
              {user ? (
                <div className="flex items-center space-x-6">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center space-x-3 px-4 py-2 bg-white/60 border border-sand-200 rounded-full shadow-sm hover:border-terracotta hover:bg-white transition-all group"
                    title="Go to Dashboard"
                  >
                    <div className="w-8 h-8 rounded-full bg-sage flex items-center justify-center text-xs font-black text-white shadow-sm group-hover:scale-105 transition-all overflow-hidden">
                      {user.profile_image ? (
                        <img src={getImageUrl(user.profile_image)} alt={user.full_name} className="w-full h-full object-cover" />
                      ) : (
                        user.full_name?.[0]?.toUpperCase() || <User className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-[10px] font-black text-charcoal uppercase tracking-widest pr-1">
                      {user.full_name?.split(' ')[0]}
                    </span>
                  </button>
                  <button
                    onClick={logout}
                    className="flex items-center space-x-2 text-[10px] font-black text-terracotta uppercase tracking-[0.2em] hover:underline transition-all"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('signOut')}</span>
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className="text-charcoal font-bold text-sm uppercase tracking-widest hover:text-terracotta transition-colors"
                  >
                    {t('signIn')}
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="btn-premium py-2 text-sm"
                  >
                    {t('getStarted')}
                  </button>
                </>
              )}
            </div>

            {/* Mobile Auth / Dashboard Icon */}
            <div className="flex md:hidden items-center">
              {user ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-8 h-8 rounded-full bg-sage flex items-center justify-center text-xs font-black text-white shadow-sm overflow-hidden"
                  title="Go to Dashboard"
                >
                  {user.profile_image ? (
                    <img src={getImageUrl(user.profile_image)} alt={user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    user.full_name?.[0]?.toUpperCase() || <User className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="text-charcoal font-bold text-xs uppercase tracking-widest hover:text-terracotta transition-colors border border-sand-300 rounded-full px-3 py-1.5"
                >
                  {t('signIn')}
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center py-20 z-10">



        {/* Animated Background Elements */}
        <div className="absolute top-20 -right-20 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-terracotta/5 rounded-full blur-[80px] md:blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 -left-20 w-[250px] md:w-[400px] h-[250px] md:h-[400px] bg-sage/10 rounded-full blur-[70px] md:blur-[100px]"></div>


        <div className="max-w-7xl mx-auto px-8 grid lg:grid-cols-2 gap-12 items-center relative z-10">
          {(() => {
            const defaultHero = {
              sub_tag: t('heroSubTag'),
              title: t('heroTitle'),
              subtitle: t('heroSubtitle'),
              image_url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop",
              rating: t('heroRating'),
              trusted_text: t('heroTrusted')
            };
            const heroData = lang === 'en' ? (cmsContent?.hero || defaultHero) : defaultHero;
            return (
              <>
                <div className="animate-slide-up">
                  <span className="inline-block px-4 py-1.5 rounded-full bg-terracotta/10 text-terracotta font-bold text-xs uppercase tracking-[0.2em] mb-6">
                    {heroData.sub_tag}
                  </span>
                  <h2 
                    className="text-4xl md:text-6xl lg:text-7xl font-black text-charcoal leading-[1.05] mb-8 tracking-tight"
                    dangerouslySetInnerHTML={{ __html: heroData.title }}
                  />
                  <p className="text-lg md:text-xl text-charcoal-light mb-12 max-w-lg leading-relaxed mx-auto lg:mx-0">
                    {heroData.subtitle}
                  </p>
                </div>

                <div className="relative animate-fade-in delay-300 z-10 w-full lg:w-auto">
                   <div className="relative z-10 rounded-2xl overflow-hidden shadow-elevated lg:rotate-2 hover:rotate-0 transition-transform duration-700">
                      <img 
                        src={getImageUrl(heroData.image_url)} 
                        alt="Premium Property" 
                        className="w-full h-[300px] md:h-[500px] lg:h-[600px] object-cover"
                      />
                   </div>

                   {/* Floating Info Card */}
                   <div className="hidden sm:block absolute -bottom-10 -left-10 glass p-6 rounded-2xl shadow-premium animate-float z-20 max-w-[280px]">
                      <div className="flex items-center space-x-4 mb-3">
                         <div className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center text-sage">
                            <Star className="w-5 h-5 fill-current" />
                         </div>
                         <div>
                            <p className="text-xs text-charcoal-muted font-bold uppercase tracking-widest">{t('topRated')}</p>
                            <p className="font-black text-charcoal">{heroData.rating}</p>
                         </div>
                      </div>
                      <p className="text-sm text-charcoal-light leading-relaxed">{heroData.trusted_text}</p>
                   </div>
                </div>
              </>
            );
          })()}
        </div>

        {/* Modern Search Pill - Centered below hero content */}
        <div className="relative mt-8 md:mt-16 z-50 px-4 md:px-8 flex justify-center w-full animate-slide-up delay-500">
            <div className="relative w-full max-w-5xl">
              <div className="bg-white rounded-3xl lg:rounded-full shadow-2xl border border-sand-200 p-2 lg:p-2 flex flex-col lg:flex-row items-stretch lg:items-center">

                
                {/* Location */}
                <div 
                  className={`flex-1 flex items-center px-8 py-3 rounded-full cursor-pointer transition-colors ${activeDropdown === 'location' ? 'bg-sand-50' : 'hover:bg-sand-50/50'}`}
                  onClick={() => setActiveDropdown(activeDropdown === 'location' ? null : 'location')}
                >
                  <MapPin className="w-5 h-5 text-terracotta mr-3 flex-shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-black uppercase tracking-widest text-charcoal-muted mb-0.5">{t('whereToNext')}</p>
                    <p className="text-sm font-bold text-charcoal truncate">{locationQuery || t('searchDestinations')}</p>
                  </div>
                </div>

                <div className="hidden lg:block w-px h-10 bg-sand-200 mx-2"></div>
                <div className="lg:hidden h-px w-full bg-sand-200 my-1"></div>


                {/* Dates */}
                <div 
                  className={`flex-1 flex items-center px-8 py-3 rounded-full cursor-pointer transition-colors ${activeDropdown === 'dates' ? 'bg-sand-50' : 'hover:bg-sand-50/50'}`}
                  onClick={() => setActiveDropdown(activeDropdown === 'dates' ? null : 'dates')}
                >
                  <Calendar className="w-5 h-5 text-sage mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-charcoal-muted mb-0.5">{t('selectDates')}</p>
                    <p className="text-sm font-bold text-charcoal">
                      {dates.checkIn ? `${dates.checkIn} - ${dates.checkOut || t('addDates')}` : t('addDates')}
                    </p>
                  </div>
                </div>

                <div className="hidden lg:block w-px h-10 bg-sand-200 mx-2"></div>
                <div className="lg:hidden h-px w-full bg-sand-200 my-1"></div>


                {/* Guests */}
                <div 
                  className={`flex-1 flex items-center px-8 py-3 rounded-full cursor-pointer transition-colors ${activeDropdown === 'guests' ? 'bg-sand-50' : 'hover:bg-sand-50/50'}`}
                  onClick={() => setActiveDropdown(activeDropdown === 'guests' ? null : 'guests')}
                >
                  <Search className="w-5 h-5 text-charcoal-muted mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-charcoal-muted mb-0.5">{t('whosComing')}</p>
                    <p className="text-sm font-bold text-charcoal">
                      {guestCounts.adults + guestCounts.children} {t('guests')}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={handleSearch}
                  className="bg-terracotta hover:bg-terracotta-dark text-white px-10 py-5 lg:py-4 rounded-2xl lg:rounded-full shadow-lg transition-all active:scale-95 mt-2 lg:mt-0 lg:ml-2 flex items-center justify-center space-x-3"
                >
                  <span className="font-bold text-sm">{t('search')}</span>
                  <Search className="w-5 h-5" />
                </button>
              </div>


              {/* Dropdowns */}
              {/* Location Dropdown */}
              {activeDropdown === 'location' && (
                <div className="absolute top-full mt-4 left-0 right-0 lg:right-auto lg:w-96 bg-white rounded-3xl shadow-2xl border border-sand-200 p-6 lg:p-8 z-[60] animate-slide-up overflow-visible mx-4 lg:mx-0">


                  <div className="relative mb-6">
                    <input 
                      type="text"
                      autoFocus
                      placeholder={t('searchDestinations') + "..."}
                      className="w-full bg-sand-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-charcoal focus:ring-2 focus:ring-terracotta/20"
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    {LOCATIONS.map(loc => (
                      <div 
                        key={loc.name}
                        className="flex items-center space-x-4 p-3 rounded-2xl hover:bg-sand-50 cursor-pointer transition-colors group"
                        onClick={() => {
                          setLocationQuery(loc.name);
                          setActiveDropdown(null);
                        }}
                      >
                        <img src={loc.img} alt="" className="w-12 h-12 rounded-xl object-cover" />
                        <div className="flex-1">
                          <p className="font-bold text-charcoal group-hover:text-terracotta transition-colors">{loc.name}</p>
                          <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest">City</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeDropdown === 'dates' && (
                <div className="absolute top-full mt-4 left-0 right-0 lg:left-1/4 lg:right-auto lg:w-96 bg-white rounded-3xl shadow-2xl border border-sand-200 p-6 lg:p-8 z-[60] animate-slide-up overflow-visible mx-4 lg:mx-0">
                  <div className="grid grid-cols-1 gap-6 mb-8">
                    <div>
                      <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-2">{t('checkIn')}</p>
                      <input 
                        type="date" 
                        min={todayISO}
                        className="w-full bg-sand-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-charcoal focus:ring-2 focus:ring-terracotta/20"
                        value={dates.checkIn}
                        onChange={(e) => setDates(prev => ({ ...prev, checkIn: e.target.value }))}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-2">{t('checkOut')}</p>
                      <input 
                        type="date" 
                        min={dates.checkIn || todayISO}
                        className="w-full bg-sand-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-charcoal focus:ring-2 focus:ring-terracotta/20"
                        value={dates.checkOut}
                        onChange={(e) => setDates(prev => ({ ...prev, checkOut: e.target.value }))}
                      />
                    </div>
                  </div>
                  <button 
                    className="btn-premium w-full py-4 text-[10px]"
                    onClick={() => setActiveDropdown(null)}
                  >
                    {t('confirmDates')}
                  </button>
                </div>
              )}

              {activeDropdown === 'guests' && (
                <div className="absolute top-full mt-4 left-0 right-0 lg:left-auto lg:right-0 lg:w-96 bg-white rounded-3xl shadow-2xl border border-sand-200 p-6 lg:p-8 z-[60] animate-slide-up overflow-visible mx-4 lg:mx-0">
                  <div className="space-y-8 mb-8">
                    {[
                      { key: 'adults', label: t('adults'), desc: t('ages18') },
                      { key: 'children', label: t('children'), desc: t('ages617') },
                      { key: 'infants', label: t('infants'), desc: t('under5') },
                    ].map((type) => (
                      <div key={type.key} className="flex items-center justify-between">
                        <div>
                          <p className="font-black text-charcoal uppercase tracking-widest text-[10px] mb-1">{type.label}</p>
                          <p className="text-xs text-charcoal-muted font-bold">{type.desc}</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <button 
                            className="w-8 h-8 rounded-full border border-sand-300 flex items-center justify-center text-charcoal hover:border-terracotta hover:text-terracotta transition-all disabled:opacity-30"
                            disabled={guestCounts[type.key] === (type.key === 'adults' ? 1 : 0)}
                            onClick={() => setGuestCounts(prev => ({ ...prev, [type.key]: prev[type.key] - 1 }))}
                          >
                            -
                          </button>
                          <span className="w-4 text-center font-black text-charcoal">{guestCounts[type.key]}</span>
                          <button 
                            className="w-8 h-8 rounded-full border border-sand-300 flex items-center justify-center text-charcoal hover:border-terracotta hover:text-terracotta transition-all"
                            onClick={() => setGuestCounts(prev => ({ ...prev, [type.key]: prev[type.key] + 1 }))}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-6 border-t border-sand-200">
                    <button 
                      className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest hover:text-terracotta"
                      onClick={() => setGuestCounts({ adults: 2, children: 0, infants: 0 })}
                    >
                      {t('clear')}
                    </button>
                    <button 
                      className="btn-premium px-6 py-3 text-[10px]"
                      onClick={() => setActiveDropdown(null)}
                    >
                      {t('applySearch')}
                    </button>
                  </div>
                </div>
              )}
            </div>
        </div>
      </section>

      {/* Category Selection Circles */}
      <section className="relative max-w-7xl mx-auto px-4 md:px-8 pt-12 md:pt-16 pb-0 flex justify-center animate-fade-in">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[110%] bg-gradient-to-r from-terracotta/5 via-sage/5 to-gold/5 blur-3xl rounded-full opacity-65 pointer-events-none"></div>

        <div className="relative flex justify-center items-center gap-4 sm:gap-10 md:gap-16 w-full max-w-4xl py-6 md:py-8 px-4 md:px-6 bg-gradient-to-br from-white/95 via-sand-50/80 to-white/95 backdrop-blur-xl rounded-3xl md:rounded-[2.5rem] border border-sand-200/80 shadow-premium transition-all duration-300 hover:shadow-elevated hover:border-sand-300/80">
          {[
            { id: 'residential', label: t('catResidential'), icon: Home, color: 'bg-terracotta/5 text-terracotta border-terracotta/20 hover:bg-terracotta hover:text-white hover:shadow-lg hover:shadow-terracotta/25 hover:border-terracotta', hoverColor: 'group-hover:text-terracotta' },
            { id: 'commercial', label: t('catCommercial'), icon: Briefcase, color: 'bg-sage/5 text-sage border-sage/20 hover:bg-sage hover:text-white hover:shadow-lg hover:shadow-sage/25 hover:border-sage', hoverColor: 'group-hover:text-sage' },
            { id: 'event_venue', label: t('catEvent'), icon: PartyPopper, color: 'bg-amber-500/5 text-amber-600 border-amber-500/20 hover:bg-amber-500 hover:text-white hover:shadow-lg hover:shadow-amber-500/25 hover:border-amber-500', hoverColor: 'group-hover:text-amber-600' }
          ].map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  const totalGuests = guestCounts.adults + guestCounts.children;
                  navigate(`/guest/browse?category=${cat.id}&city=${locationQuery}&guests=${totalGuests}&checkIn=${dates.checkIn}&checkOut=${dates.checkOut}`);
                }}
                className="flex flex-col items-center group focus:outline-none transition-all duration-500 transform hover:-translate-y-2 animate-slide-up"
                style={{ animationDelay: `${idx * 150}ms` }}
              >
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center border transition-all duration-500 ${cat.color}`}>
                  <Icon className="w-6 h-6 md:w-8 md:h-8 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6" />
                </div>
                <span className={`text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] mt-4 transition-colors duration-300 ${cat.hoverColor}`}>
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-32 space-y-16 md:space-y-32">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-6">
          <div>
            <h3 className="text-3xl md:text-5xl font-black text-charcoal tracking-tight mb-3 md:mb-4">{t('featuredCollections')}</h3>
            <p className="text-charcoal-light text-base md:text-lg">{t('featuredSub')}</p>
          </div>
          <button 
            onClick={() => {
              const totalGuests = guestCounts.adults + guestCounts.children;
              navigate(`/guest/browse?city=${locationQuery}&guests=${totalGuests}&checkIn=${dates.checkIn}&checkOut=${dates.checkOut}`);
            }}
            className="btn-premium-outline self-start md:self-auto w-full md:w-auto text-center"
          >
            {t('viewAll')}
          </button>
        </div>

        {[
          { id: 'residential', label: t('residential'), icon: Building2, desc: t('residentialSub') },
          { id: 'commercial', label: t('commercial'), icon: Building2, desc: t('commercialSub') },
          { id: 'event_venue', label: t('eventVenue'), icon: Calendar, desc: t('eventVenueSub') }
        ].map((cat) => (
          <div key={cat.id} className="animate-fade-in">
            <div className="flex items-center space-x-3 md:space-x-4 mb-8 md:mb-10">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-terracotta/10 flex items-center justify-center text-terracotta shadow-sm shrink-0">
                <cat.icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <h4 className="text-xl md:text-3xl font-black text-charcoal tracking-tight uppercase leading-tight">{cat.label}</h4>
                <p className="text-xs md:text-base text-charcoal-muted font-medium mt-0.5">{cat.desc}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <div key={i} className="h-64 bg-sand-100 rounded-2xl animate-pulse"></div>
                ))
              ) : properties[cat.id]?.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-sand-100 shadow-sm">
                   <p className="text-charcoal-muted font-bold">{t('comingSoon').replace('{category}', cat.label)}</p>
                </div>
              ) : (
                <>
                  {properties[cat.id].slice(0, 5).map((property, idx) => (
                    <div
                      key={property.property_id}
                      className="group cursor-pointer flex flex-col"
                      onClick={() => {
                        const totalGuests = guestCounts.adults + guestCounts.children;
                        navigate(`/property/${property.property_id}?checkIn=${dates.checkIn}&checkOut=${dates.checkOut}&guests=${totalGuests}`);
                      }}
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl mb-3">
                        <img
                          src={getImageUrl(property.images?.[0]) || "https://images.unsplash.com/photo-1600585154340-be6199f7d009?q=80&w=2070&auto=format&fit=crop"}
                          alt={property.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded-full shadow-sm">
                          <span className="text-[10px] font-black uppercase text-charcoal">
                            {property.property_type?.replace('_', ' ') || property.category?.replace('_', ' ')}
                          </span>
                        </div>
                        <button className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-white/20 transition-colors">
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="rgba(0,0,0,0.5)" stroke="white" strokeWidth="2" className="w-5 h-5">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                           </svg>
                        </button>
                      </div>
                      <div className="flex flex-col flex-1 px-1">
                        <div className="flex justify-between items-start mb-0.5">
                          <h4 className="text-[15px] font-bold text-charcoal truncate pr-2">{property.title}</h4>
                          <div className="flex items-center space-x-1 shrink-0 pt-0.5">
                             <Star className="w-3.5 h-3.5 text-charcoal fill-charcoal" />
                             <span className="text-[13px] font-medium text-charcoal">{property.rating ? property.rating.toFixed(2) : 'New'}</span>
                          </div>
                        </div>
                        <div className="text-[14px] text-charcoal-muted truncate mb-1">
                          {property.city}, {property.state || 'India'}
                        </div>
                        <div className="mt-auto pt-1 flex items-baseline space-x-1">
                          <span className="text-[14px] font-bold text-charcoal">₹{property.price_per_night?.toLocaleString('en-IN')}</span>
                          <span className="text-[14px] text-charcoal">
                            {property.category === 'commercial' || property.category === 'event_venue'
                              ? (property.pricing_cycle === 'hourly' ? `/ ${t('hour')}` : property.pricing_cycle === 'weekly' ? `/ ${t('week')}` : property.pricing_cycle === 'monthly' ? `/ ${t('month')}` : `/ ${t('day')}`)
                              : `/ ${t('night')}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {properties[cat.id].length > 0 && (
                    <div 
                      onClick={() => {
                        const totalGuests = guestCounts.adults + guestCounts.children;
                        navigate(`/guest/browse?category=${cat.id}&city=${locationQuery}&guests=${totalGuests}&checkIn=${dates.checkIn}&checkOut=${dates.checkOut}`);
                      }}
                      className="group cursor-pointer flex flex-col justify-center items-center rounded-2xl border-2 border-dashed border-sand-300 hover:border-terracotta hover:bg-terracotta/5 transition-all p-6 min-h-[220px]"
                    >
                      <div className="w-12 h-12 rounded-full border border-sand-300 bg-white flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-terracotta group-hover:text-white group-hover:border-terracotta transition-all shadow-sm">
                        <ArrowRight className="w-5 h-5 text-charcoal transition-colors group-hover:text-white" />
                      </div>
                      <h4 className="text-[15px] font-bold text-charcoal group-hover:text-terracotta transition-colors">{t('viewAll')}</h4>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* CTA Section */}
      <section className="relative mx-8 mb-32 rounded-[2.5rem] overflow-hidden bg-charcoal-deep py-24 px-8 text-center">
        <div className="absolute inset-0 opacity-20" style={{
           backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")'
        }}></div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <h3 
            className="text-5xl font-black text-white mb-6 tracking-tight"
            dangerouslySetInnerHTML={{ __html: t('readyToHost') }}
          />
          <p className="text-white/70 text-xl mb-12 font-medium">
            {t('ctaParagraph')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button
              onClick={() => navigate('/register')}
              className="btn-premium px-12 py-4 text-lg w-full sm:w-auto"
            >
              {t('listProperty')}
            </button>
            <button className="text-white font-bold hover:text-terracotta transition-colors text-lg">{t('learnFees')}</button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      {cmsContent?.testimonials?.items && (
        <section className="max-w-7xl mx-auto px-8 mb-32 animate-fade-in">
          <div className="py-20 bg-sand-100/50 rounded-[3rem] px-8 border border-sand-200">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full bg-terracotta/10 text-terracotta font-bold text-xs uppercase tracking-[0.2em] mb-4">
                {t('guestStories')}
              </span>
              <h3 className="text-4xl md:text-5xl font-black text-charcoal tracking-tight mb-4">
                {t('lovedByGuests')}
              </h3>
              <p className="text-charcoal-light text-lg">
                {t('testimonialsSub')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {cmsContent.testimonials.items.map((item, idx) => (
                <div key={item.id || idx} className="bg-white rounded-3xl p-8 border border-sand-200 shadow-sm hover:shadow-md transition duration-300">
                  <div className="flex space-x-1 mb-4 text-yellow-500">
                    {Array(item.rating || 5).fill(0).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-charcoal-light text-sm italic font-medium leading-relaxed mb-6">
                    "{item.comment}"
                  </p>
                  <div className="flex items-center space-x-4">
                    <img 
                      src={getImageUrl(item.avatar_url) || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"} 
                      alt={item.name} 
                      className="w-12 h-12 rounded-full object-cover border-2 border-sand-200"
                    />
                    <div>
                      <h5 className="font-bold text-charcoal">{item.name}</h5>
                      <p className="text-xs text-charcoal-muted font-bold">{item.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Blog Section */}
      {cmsContent?.blog?.posts && (
        <section className="max-w-7xl mx-auto px-8 mb-32 animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-sage/10 text-sage font-bold text-xs uppercase tracking-[0.2em] mb-4">
                {t('ourJournal')}
              </span>
              <h3 className="text-4xl md:text-5xl font-black text-charcoal tracking-tight">
                {t('latestBlog')}
              </h3>
            </div>
            <p className="text-charcoal-light text-lg max-w-md">
              {t('blogSub')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {cmsContent.blog.posts.map((post, idx) => (
              <div key={post.id || idx} className="group cursor-pointer bg-white rounded-3xl overflow-hidden border border-sand-200 shadow-sm hover:shadow-md transition duration-300">
                <div className="h-64 overflow-hidden relative">
                  <img 
                    src={getImageUrl(post.image_url) || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600"} 
                    alt={post.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-charcoal shadow-sm">
                    {post.read_time || '5 min read'}
                  </span>
                </div>
                <div className="p-8">
                  <div className="flex items-center space-x-2 text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-3">
                    <span>{post.author}</span>
                    <span>•</span>
                    <span>{post.date}</span>
                  </div>
                  <h4 className="text-2xl font-black text-charcoal mb-4 group-hover:text-terracotta transition-colors line-clamp-2">
                    {post.title}
                  </h4>
                  <p className="text-charcoal-light text-sm font-semibold leading-relaxed mb-6 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <span className="text-xs font-black text-terracotta uppercase tracking-wider group-hover:underline">
                    {t('readArticle')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-sand-200 pt-16 md:pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-16 mb-16 md:mb-24">
            <div className="sm:col-span-2">

              <div className="flex items-center space-x-3 mb-8">
                <Building2 className="w-8 h-8 text-terracotta" />
                <h4 className="text-2xl font-black text-charcoal tracking-tighter">GOLDEN RICH STAY</h4>
              </div>
              <p className="text-charcoal-light text-lg mb-8 max-w-sm">
                {t('footerSub')}
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
            <div>
              <h5 className="font-black text-charcoal uppercase tracking-[0.2em] text-xs mb-8">{t('forGuests')}</h5>
              <ul className="space-y-4 text-charcoal-light font-medium">
                <li><a href="#" className="hover:text-terracotta transition-colors">{t('browseCollections')}</a></li>
                <li><a href="#" className="hover:text-terracotta transition-colors">{t('safetyProtocols')}</a></li>
                <li><a href="#" className="hover:text-terracotta transition-colors">{t('guestSupport')}</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-black text-charcoal uppercase tracking-[0.2em] text-xs mb-8">{t('forHosts')}</h5>
              <ul className="space-y-4 text-charcoal-light font-medium">
                <li><a href="#" className="hover:text-terracotta transition-colors">{t('listSpace')}</a></li>
                <li><a href="#" className="hover:text-terracotta transition-colors">{t('hostingStandards')}</a></li>
                <li><a href="#" className="hover:text-terracotta transition-colors">{t('payoutSystem')}</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-black text-charcoal uppercase tracking-[0.2em] text-xs mb-8">{t('contact')}</h5>
              <ul className="space-y-4 text-charcoal-light font-medium">
                <li><p>{t('mumbaiHQ')}</p></li>
                <li><p>support@goldenrichstay.com</p></li>
                <li><p>+91 8484826247</p></li>
              </ul>
            </div>
          </div>
          <div className="pt-12 border-t border-sand-200 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-charcoal-muted font-bold text-sm tracking-wide uppercase">{t('precision')}</p>
            <div className="flex space-x-8 text-sm font-bold text-charcoal-muted uppercase tracking-widest">
               <a href="#" className="hover:text-terracotta">{t('privacy')}</a>
               <a href="#" className="hover:text-terracotta">{t('terms')}</a>
               <a href="#" className="hover:text-terracotta">{t('cookies')}</a>
            </div>
          </div>
        </div>
      </footer>
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
          <HowItWorksModal 
            isOpen={showHowItWorksModal} 
            onClose={() => setShowHowItWorksModal(false)} 
            user={user} 
            navigate={navigate} 
            steps={stepsData}
            t={t}
          />
        );
      })()}
    </div>
  );
};

export default LandingPage;
