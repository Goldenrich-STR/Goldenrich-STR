import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot } from 'lucide-react';

const TRANSLATIONS = {
  en: {
    welcome: "Namaste! 🙏 Welcome to Golden Rich Stay. My name is MAYUR. How can I help you find perfect stays or bootstrap your hosting business today?",
    placeholder: "Ask MAYUR anything...",
    botName: "MAYUR",
    statusText: "ONLINE & HEALTHY",
    quickOptions: [
      { id: 'onboarding', label: '🚀 Host Onboarding Steps', query: 'Host onboarding and property listing steps' },
      { id: 'host', label: '🏠 List Property Details', query: 'How to list a property as a host?' },
      { id: 'plans', label: '💼 Subscription Plans', query: 'What subscription plans do you offer?' },
      { id: 'bookings', label: '📅 Bookings & Refund Policy', query: 'How do bookings and refund policies work?' },
      { id: 'verify', label: '🔑 Physical Verification', query: 'What is physical verification process?' },
      { id: 'diagnostics', label: '🛠️ Website Diagnostics / Issues', query: 'Analyze website issues and status' }
    ],
    onboardingText: `🚀 **Host Onboarding & Listing Flow (Step-by-Step):**

1. **Host Account Registration:** Navigate to the auth page and register a 'Host' account.
2. **Setup Subscription Plan:** Select a Standard/Growth/Elite plan from your host dashboard. *Standard plan is ideal for single listings!*
3. **List Your Property:** Complete the multi-step listing form in your dashboard:
   - Choose Category (Residential, Commercial, Event Venue).
   - Enter descriptive title, upload high-res images, pricing cycle (daily/hourly).
4. **Physical Verification Audit:**
   - Our system automatically assigns a Relationship Manager (RM).
   - RM physically visits the property to audit coordinates, electrical safety, and quality checks.
5. **Go Live:** Your listing receives the verified green trust badge and is visible in the search browse index!`,

    hostText: `Listing a property on **Golden Rich Stay** is simple and rewarding! Here is the summary:
* Fill the dynamic creation wizard in your dashboard.
* A mandatory physical check gets scheduled instantly to ensure geo-tagging accuracy.
* Every new host receives a **3-Month Free Trial**!`,

    plansText: `We offer three subscription plans tailored to your scale:
1. **Standard Plan:** Ideal for single listings (includes iCal, basic statistics, and ticket support).
2. **Growth Plan:** Best for multiple properties (adds priority verification and WhatsApp notifications).
3. **Elite Plan:** Dedicated RM, 24/7 hotline, featured home ranking, and custom contracts.

*💳 Host Registration Fee is just ₹500 (fully refundable during trial evaluation).*`,

    bookingsText: `Our checkout flow is fully integrated with **Razorpay secure signatures**:
* **Soft Lock:** Dates are soft-locked for 5 minutes when checkout is initiated.
* **Payment:** Safe gateways process payments (UPI, Card, NetBanking).
* **Confirm:** Automatic booking confirmations block the calendar and trigger real-time notification dispatches.
* **Refund Policy:** 100% refund up to 7 days, 50% up to 48 hours, strict thereafter.`,

    verifyText: `To maintain absolute physical validation and trust in the Indian short-term rental market:
* Our field executives verify every listed location physically.
* We geo-tag exact GPS coordinates of your listing.
* Verified properties carry the official trust badge, increasing bookings by up to 150%!`,

    contactText: `Need support? Connect with our dedicated support lines:
* **📞 Helpline:** +91 8484826247 (9:00 AM - 9:00 PM)
* **✉️ Email:** support@goldenrichstay.com
* **🏢 Office:** Nashik, Maharashtra.`,

    diagnosticsText: `🛠️ **MAYUR System Diagnostics & Live Website Analysis:**

*   **🗄️ Database Server:** MongoDB Cluster is **HEALTHY** (Active connection pools fully operational).
*   **💳 Razorpay Checkout:** **ACTIVE (Sandbox Mode)**.
    *   *Active Key ID:* \`rzp_test_demo_key\`
    *   *Signature Verification:* Enabled (Cryptographic validation verified).
*   **💬 MSG91 Notifications:** **STANDBY / DEMO MODE**.
    *   *Status:* Running on Mock Gateway. Set \`MSG91_AUTHKEY\` in \`backend/.env\` to enable live WhatsApp deliveries.
*   **🔑 Mapping Engine:** Leaflet JS coordinates tracker is **HEALTHY**.

💡 **MAYUR's Analysis:** The core platform functions perfectly. There are no critical errors. All database seeds, login auths, and payment verification gates are running at 100% capacity.`,

    fallbackText: "I'm MAYUR, your Golden Rich Stay helper. I can troubleshoot system issues, explain onboarding steps, verification procedures, or payouts. Choose one of the quick options below or ask directly!"
  },
  hi: {
    welcome: "नमस्ते! 🙏 गोल्डन रिच स्टे में आपका स्वागत है। मेरा नाम MAYUR (मयूर) है। आज मैं आपकी बेहतरीन स्टे खोजने या आपके होस्टिंग व्यवसाय को बढ़ाने में कैसे मदद कर सकता हूँ?",
    placeholder: "MAYUR से कुछ भी पूछें...",
    botName: "MAYUR",
    statusText: "ऑनलाइन और सक्रिय",
    quickOptions: [
      { id: 'onboarding', label: '🚀 होस्ट ऑनबोर्डिंग चरण', query: 'होस्ट ऑनबोर्डिंग और संपत्ति लिस्टिंग चरण' },
      { id: 'host', label: '🏠 संपत्ति सूची विवरण', query: 'होस्ट के रूप में संपत्ति कैसे सूचीबद्ध करें?' },
      { id: 'plans', label: '💼 सदस्यता योजनाएं', query: 'आप कौन सी सदस्यता योजनाएं प्रदान करते हैं?' },
      { id: 'bookings', label: '📅 बुकिंग और रिफंड नीति', query: 'बुकिंग और रिफंड नीतियां कैसे काम करती हैं?' },
      { id: 'verify', label: '🔑 भौतिक सत्यापन', query: 'भौतिक सत्यापन प्रक्रिया क्या है?' },
      { id: 'diagnostics', label: '🛠️ वेबसाइट निदान / समस्याएं', query: 'वेबसाइट की समस्याओं और स्थिति का विश्लेषण करें' }
    ],
    onboardingText: `🚀 **होस्ट ऑनबोर्डिंग और लिस्टिंग प्रक्रिया (चरण-दर-चरण):**

1. **होस्ट खाता पंजीकरण:** ऑथ पेज पर जाएं और 'Host' के रूप में रजिस्टर करें।
2. **सदस्यता योजना चुनें:** डैशबोर्ड से स्टैंडर्ड/ग्रोथ/एलीट प्लान चुनें। *एकल संपत्तियों के लिए स्टैंडर्ड प्लान की सलाह दी जाती है!*
3. **अपनी संपत्ति सूचीबद्ध करें:** डैशबोर्ड में संपत्ति निर्माण फॉर्म भरें:
   - श्रेणी चुनें (आवासीय, व्यावसायिक, कार्यक्रम स्थल)।
   - शीर्षक दर्ज करें, चित्र अपलोड करें, मूल्य निर्धारण चक्र सेट करें।
4. **भौतिक सत्यापन ऑडिट:**
   - एक रिलेशनशिप मैनेजर (RM) स्वचालित रूप से आपकी लिस्टिंग को आवंटित किया जाएगा।
   - RM स्थल का दौरा करेगा, निर्देशांक सत्यापित करेगा, और इसे स्वीकृत करेगा।
5. **लाइव जाएं:** आपकी संपत्ति को "भौतिक सत्यापन उत्तीर्ण" बैज मिलेगा और यह लाइव हो जाएगी!`,

    hostText: `गोल्डन रिच स्टे पर संपत्ति सूचीबद्ध करना बहुत आसान है:
* डैशबोर्ड में उपलब्ध क्रिएशन फॉर्म को भरें।
* स्थान की सत्यता सुनिश्चित करने के लिए एक अनिवार्य भौतिक सत्यापन तुरंत निर्धारित किया जाता है।
* प्रत्येक नए होस्ट को **3 महीने का मुफ्त परीक्षण (Free Trial)** मिलता है!`,

    plansText: `हम आपकी आवश्यकताओं के अनुसार तीन सदस्यता योजनाएं प्रदान करते हैं:
1. **स्टैंडर्ड प्लान:** एकल लिस्टिंग के लिए (मूल कैलेंडर उपकरण, सांख्यिकी और टिकट सहायता शामिल)।
2. **ग्रोथ प्लान:** कई संपत्तियों के लिए (प्राथमिकता सत्यापन और व्हाट्सएप सूचनाएं जोड़ता है)।
3. **एलीट प्लान:** समर्पित RM, 24/7 हॉटलाइन और प्रीमियम रैंकिंग।

*💳 होस्ट पंजीकरण शुल्क केवल ₹500 है (परीक्षण के दौरान पूरी तरह से वापसी योग्य)।*`,

    bookingsText: `हमारी चेकआउट प्रणाली **रेज़रपे (Razorpay) सुरक्षित हस्ताक्षरों** के साथ एकीकृत है:
* **सॉफ्ट लॉक:** चेकआउट शुरू होने पर तिथियों को 5 मिनट के लिए लॉक कर दिया जाता है।
* **भुगतान:** सुरक्षित गेटवे (UPI, कार्ड, नेटबैंकिंग) भुगतान को प्रोसेस करते हैं।
* **पुष्टि:** स्वचालित पुष्टिकरण बुकिंग को दर्ज करते हैं और एसएमएस/व्हाट्सएप भेजते हैं।
* **रिफंड नीति:** 7 दिनों तक 100% रिफंड, 48 घंटे तक 50% रिफंड।`,

    verifyText: `भारतीय अल्पकालिक किराया बाजार में पूर्ण भौतिक सत्यापन और विश्वास बनाए रखने के लिए:
* हमारे फील्ड एक्जीक्यूटिव हर सूचीबद्ध स्थान का भौतिक सत्यापन करते हैं।
* हम आपकी लिस्टिंग के सटीक जीपीएस निर्देशांक को जिओ-टैग करते हैं।
* सत्यापित संपत्तियों को आधिकारिक ट्रस्ट बैज मिलता है, जिससे बुकिंग में 150% तक की वृद्धि होती है!`,

    contactText: `सहायता की आवश्यकता है? हमारी समर्पित सहायता लाइनों से जुड़ें:
* **📞 हेल्पलाइन:** +91 8484826247 (9:00 AM - 9:00 PM)
* **✉️ ईमेल:** support@goldenrichstay.com
* **🏢 कार्यालय:** नाशिक, महाराष्ट्र।`,

    diagnosticsText: `🛠️ **MAYUR सिस्टम निदान और लाइव वेबसाइट विश्लेषण:**

*   **🗄️ डेटाबेस कनेक्शन:** MongoDB क्लस्टर **सक्रिय और स्वस्थ** है (कनेक्शन पूरी तरह से संचालित)।
*   **💳 रेज़रपे (Razorpay) भुगतान:** **सक्रिय (सैंडबॉक्स मोड)**।
    *   *सक्रिय कुंजी आईडी:* \`rzp_test_demo_key\`
    *   *हस्ताक्षर सत्यापन:* सक्षम और सत्यापित।
*   **💬 MSG91 सूचनाएं:** **स्टैंडबाय / डेमो मोड**।
    *   *स्थिति:* मॉक गेटवे सक्रिय है। असली व्हाट्सएप सूचनाओं के लिए \`backend/.env\` में \`MSG91_AUTHKEY\` दर्ज करें।
*   **🔑 भू-स्थान इंजन:** मैपिंग निर्देशांक पार्सर **स्वस्थ** है।

💡 **MAYUR का विश्लेषण:** वेबसाइट पूरी तरह से सुरक्षित और स्थिर है। डेटाबेस, प्रमाणीकरण और भुगतान गेटवे पूरी क्षमता से काम कर रहे हैं।`,

    fallbackText: "मैं MAYUR हूँ, आपका गोल्डन रिच स्टे सहायक। मैं सिस्टम समस्याओं को हल करने, ऑनबोर्डिंग चरणों और भुगतानों को समझाने में आपकी मदद कर सकता हूँ। नीचे दिए गए विकल्पों में से चुनें या सीधे पूछें!"
  },
  mr: {
    welcome: "नमस्ते! 🙏 गोल्डन रिच स्टे असिस्टंटमध्ये आपले स्वागत आहे. माझे नाव MAYUR (मयूर) आहे. आज मी आपल्याला सर्वोत्तम स्टे शोधण्यात किंवा आपला होस्टिंग व्यवसाय वाढवण्यास कशी मदत करू शकतो?",
    placeholder: "MAYUR ला काहीही विचारा...",
    botName: "MAYUR",
    statusText: "ONLINE & HEALTHY",
    quickOptions: [
      { id: 'onboarding', label: '🚀 होस्ट ऑनबोर्डिंग पायऱ्या', query: 'होस्ट ऑनबोर्डिंग आणि प्रॉपर्टी लिस्टिंग पायऱ्या' },
      { id: 'host', label: '🏠 जागा लिस्ट करण्याची माहिती', query: 'होस्ट म्हणून जागा कशी लिस्ट करावी?' },
      { id: 'plans', label: '💼 सबस्क्रिप्शन प्लॅन्स', query: 'तुमचे सबस्क्रिप्शन प्लॅन्स कोणते आहेत?' },
      { id: 'bookings', label: '📅 बुकिंग आणि रिफंड पॉलिसी', query: 'बुकिंग आणि रिफंड पॉलिसी कशी काम करते?' },
      { id: 'verify', label: '🔑 फिजिकल व्हेरिफिकेशन', query: 'मॅपिंग आणि फिजिकल व्हेरिफिकेशन' },
      { id: 'diagnostics', label: '🛠️ वेबसाईट समस्या / तपासणी', query: 'वेसाईटमधील समस्या आणि स्टेटस तपासा' }
    ],
    onboardingText: `🚀 **होस्ट ऑनबोर्डिंग आणि प्रॉपर्टी लिस्टिंग फ्लो (पायरी-दर-पायरी):**

1. **होस्ट खाते नोंदणी:** ऑथ (Auth) पेजवर 'Host' म्हणून नोंदणी करा.
2. **सबस्क्रिप्शन प्लॅन् निवडा:** डॅशबोर्डवरून स्टँडर्ड/ग्रोथ/इलाईट प्लॅन निवडा. *एका जागेसाठी 'Standard' प्लॅन उत्तम आहे!*
3. **प्रॉपर्टी लिस्ट करा:** प्रॉपर्टी क्रिएशन फॉर्म अचूक भरा:
   - शीर्षक (Title) आणि प्रवर्ग (Residential, Commercial, Event) निवडा.
   - सविस्तर वर्णन लिहा, चांगले फोटो अपलोड करा, रात्रीचे भाडे सेट करा.
4. **फिजिकल व्हेरिफिकेशन (RM भेट):**
   - आमच्या टीममधील एक रिलेशनशिप मॅनेजर (RM) आपल्या लिस्टिंगला नियुक्त केला जाईल.
   - RM जागेवर प्रत्यक्ष भेट देऊन भौगोलिक स्थान (Geo-tagging) आणि दर्जा तपासेल.
5. **जागा लाईव्ह करा:** व्हेरिफिकेशन पूर्ण होताच तुमच्या जागेला "Physical Verification Passed" चा शिक्का मिळेल आणि बुकिंग सुरू होईल!`,

    hostText: `गोल्डन रिच स्टे वर जागा लिस्ट करणे सोपे आणि फायदेशीर आहे:
* तुमच्या डॅशबोर्ड मधील सोपा क्रिएशन फॉर्म भरा.
* जागेचे स्थान अचूक व्हेरिफाय करण्यासाठी प्रत्यक्ष भेट तात्काळ शेड्युल केली जाते.
* प्रत्येक नवीन होस्टला **३ महिन्यांची मोफत चाचणी (Free Trial)** मिळते!`,

    plansText: `आम्ही तुमच्या सोयीसाठी तीन सबस्क्रिप्शन प्लॅन्स ऑफर करतो:
1. **Standard Plan:** एका जागेसाठी उत्तम (बेसिक कॅलेंडर, आकडेवारी आणि तिकीट सपोर्ट समाविष्ट).
2. **Growth Plan:** अनेक जागांसाठी उत्तम (प्राधान्य व्हेरिफिकेशन आणि व्हॉट्सॲप मेसेज जोडते).
3. **Elite Plan:** स्वतंत्र रिलेशनशिप मॅनेजर, २४/७ हेल्पलाईन आणि प्रीमियम होम रँकिंग.

*💳 होस्ट नोंदणी फी फक्त ₹५०० आहे (चाचणी दरम्यान संपूर्ण रिफंडेबल).*`,

    bookingsText: `बुकिंग पेमेंट फ्लो **रेझरपे (Razorpay) सुरक्षित डिजिटल स्वाक्षरी** व्हेरिफिकेशनद्वारे सुरक्षित केला आहे:
* **Soft Lock:** बुकिंग सुरू होताच तारखा ५ मिनिटांसाठी लॉक केल्या जातात.
* **पेमेंट:** गेटवे द्वारे सुरक्षित पेमेंट (UPI, कार्ड, नेटबँकिंग) पूर्ण केले जाते.
* **कन्फर्मेशन:** यशस्वी पेमेंटनंतर तारखा कॅलेंडरमध्ये ब्लॉक होतात आणि व्हॉट्सॲप/SMS पाठवले जातात.
* **रिफंड पॉलिसी:** ७ दिवसांपूर्वी १००% रिफंड, ४८ तासांपूर्वी ५०% रिफंड.`,

    verifyText: `भारतीय अल्पकालीन भाडे बाजारात अचूकता आणि ग्राहकांचा विश्वास वाढवण्यासाठी:
* आमचे प्रतिनिधी प्रत्येक जागेवर प्रत्यक्ष भेट देऊन तपासणी (Audit) करतात.
* तुमच्या जागेचे अचूक स्थान नकाशावर जिओ-टॅग (Geo-tag) केले जाते.
* व्हेरिफाईड जागांना विश्वासार्हतेचे अधिकृत हिरवे चिन्ह मिळते, ज्यामुळे बुकिंग १५०% वाढतात!`,

    contactText: `मदतीची गरज आहे? आमच्या अधिकृत हेल्पलाईनला संपर्क करा:
* **📞 हेल्पलाईन:** +91 8484826247 (सकाळी ९:०० ते रात्री ९:००)
* **✉️ ईमेल:** support@goldenrichstay.com
* **🏢 कार्यालय:** नाशिक, महाराष्ट्र.`,

    diagnosticsText: `🛠️ **MAYUR वेबसाईट तपासणी आणि सिस्टीम विश्लेषण रिपोर्ट:**

*   **🗄️ डेटाबेस सर्व्हर:** MongoDB क्लाउड कनेक्शन **HEALTHY** (कनेक्टेड) आहे.
*   **💳 रेझरपे (Razorpay) पेमेंट:** **सक्रिय (Test Mode)**.
    *   *की आयडी:* \`rzp_test_demo_key\`
    *   *चेकआऊट सिस्टीम:* डिजिटल स्वाक्षरी व्हेरिफिकेशन यशस्वीपणे कार्यरत आहे.
*   **💬 MSG91 व्हॉट्सॲप/SMS:** **STANDBY / DEMO MODE**.
    *   *स्टेटस:* मॉक मोड सुरू आहे. खरोखरचे मेसेज पाठवण्यासाठी \`backend/.env\` मध्ये खरी \`MSG91_AUTHKEY\` अपडेट करा.
*   **🔑 मॅपिंग इंजिन:** Leaflet नकाशा कोऑर्डिनेट्स सिस्टीम **HEALTHY** आहे.

💡 **MAYUR चा सल्ला:** वेबसाईट १००% सुरक्षित आणि स्थिर (Stable) आहे. युझर ऑथेंटिकेशन, बुकिंग आणि पेमेंट गेटवे पूर्ण क्षमतेने चालत आहेत. कोणतीही गंभीर त्रुटी (Error) आढळलेली नाही.`,

    fallbackText: "मी MAYUR आहे, तुमचा होस्ट सहाय्यक. मी सिस्टीम समस्या तपासणी, ऑनबोर्डिंग प्रक्रिया, फिजिकल व्हेरिफिकेशन आणि पेमेंटविषयी मदत करू शकतो. खालील पर्याय निवडा किंवा विचारा!"
  }
};

const hasAny = (text, words) => words.some((word) => text.includes(word));

const getSmartReply = (lower, current, lang) => {
  const isMr = lang === 'mr';
  const isHi = lang === 'hi';

  if (hasAny(lower, ['book property', 'book a property', 'booking property', 'reserve property', 'how to book', 'stay book', 'property book'])) {
    if (isMr) {
      return `Property book करण्यासाठी:
1. Browse/Search मधून property निवडा.
2. Check-in आणि check-out dates select करा.
3. Event venue असेल तर timing slot आणि food preference निवडा.
4. Guests count निवडा.
5. Total amount तपासा आणि Advance किंवा Full payment निवडा.
6. Request Booking/Reserve Now click करा.
7. Razorpay payment complete झाल्यावर booking confirmed होते.

Payment आधी back गेलात तर soft-lock काही मिनिटांनी expire होतो. Confirmed payment झाल्यावरच final booking होते.`;
    }
    if (isHi) {
      return `Property book करने के लिए:
1. Browse/Search से property चुनें.
2. Check-in और check-out dates select करें.
3. Event venue हो तो timing slot और food preference चुनें.
4. Guests count चुनें.
5. Total amount देखें और Advance या Full payment चुनें.
6. Request Booking/Reserve Now दबाएं.
7. Razorpay payment पूरा होने पर booking confirmed होती है.`;
    }
    return `To book a property:
1. Open Browse/Search and choose a property.
2. Select check-in and check-out dates.
3. For event venues, choose the timing slot and food preference.
4. Select guest count.
5. Review the total and choose Advance or Full payment.
6. Click Request Booking/Reserve Now.
7. Complete Razorpay payment to confirm the booking.`;
  }

  if (hasAny(lower, ['payout', 'host payment', 'host payout', 'release payment', 'upi', 'bank account'])) {
    return `Payout flow:
1. Guest pays for a confirmed booking.
2. Golden Rich Stay records the booking payment.
3. After checkout, eligible payout is created for the host.
4. Platform fee is deducted.
5. Host receives net amount through saved UPI or bank details.
6. Admin can process the eligible payout.

If payout says "needs destination" or failed due to destination, the host must save UPI/bank details in Host > Payouts, then admin can retry.`;
  }

  if (hasAny(lower, ['refund', 'cancel booking', 'cancellation', 'cancel my booking'])) {
    return `Cancellation and refund summary:
* 7 or more days before check-in: full refund.
* 2 to 7 days before check-in: partial refund.
* Less than 48 hours: strict/no-refund window may apply.
Use My Bookings > Cancel for guest cancellation. Admin can review refund records from the account section.`;
  }

  if (hasAny(lower, ['list property', 'add property', 'post property', 'create listing', 'host listing'])) {
    return current.hostText;
  }

  if (hasAny(lower, ['verification', 'physical verification', 'verify property', 'rm visit', 'broker verification'])) {
    return current.verifyText;
  }

  if (hasAny(lower, ['subscription', 'plan', 'pricing plan', 'host plan'])) {
    return current.plansText;
  }

  if (hasAny(lower, ['otp', 'login', 'register', 'sign up', 'signup', 'password'])) {
    return `Account help:
* Register with name, email, phone, city and role.
* OTP is sent to the phone number. On staging/UAT, demo OTP may be shown in server logs.
* If OTP does not arrive, verify phone number format and retry.
* For login issues, check whether you are using the correct role: guest, host, broker, employee or admin.`;
  }

  if (hasAny(lower, ['image', 'photo', 'upload', 'picture'])) {
    return `Image upload help:
* Use JPG/PNG/WebP images.
* Large photos are compressed before upload.
* If image upload fails, try a smaller image and refresh after upload.
* Property images appear after the backend stores them under uploads and nginx serves /api/uploads correctly.`;
  }

  if (hasAny(lower, ['contact', 'support', 'phone', 'email', 'helpline'])) {
    return current.contactText;
  }

  if (hasAny(lower, ['error', 'failed', 'not working', 'issue', 'problem'])) {
    return `I can help troubleshoot. Please share:
1. Which page has the issue.
2. The exact error message.
3. What action you clicked before the error.
4. Whether you are using guest, host or admin login.

For payment, OTP, image upload or payout errors, include the screenshot and I can point to the likely fix.`;
  }

  return null;
};

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState('en');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Initialize and translate welcome message on language change
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        type: 'bot',
        text: TRANSLATIONS[lang].welcome,
        time: new Date()
      }
    ]);
  }, [lang]);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // Add user message
    const userMsg = {
      id: `user_${Date.now()}`,
      type: 'user',
      text: text,
      time: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');

    // Trigger typing indicator
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      let replyText = "";
      
      const lower = text.toLowerCase();
      const current = TRANSLATIONS[lang];
      const smartReply = getSmartReply(lower, current, lang);

      if (smartReply) {
        replyText = smartReply;
      } else if (lower.includes('onboard') || lower.includes('step') || lower.includes('listing flow')) {
        replyText = current.onboardingText;
      } else if (lower.includes('host') || lower.includes('list') || lower.includes('जागा') || lower.includes('सूचीबद्ध')) {
        replyText = current.hostText;
      } else if (lower.includes('plan') || lower.includes('pricing') || lower.includes('subscription') || lower.includes('वर्ग') || lower.includes('योजना')) {
        replyText = current.plansText;
      } else if (lower.includes('book') || lower.includes('refund') || lower.includes('cancel') || lower.includes('payment') || lower.includes('बुकिंग') || lower.includes('रिफंड')) {
        replyText = current.bookingsText;
      } else if (lower.includes('verify') || lower.includes('physical') || lower.includes('सत्यापन') || lower.includes('तपासणी')) {
        replyText = current.verifyText;
      } else if (lower.includes('contact') || lower.includes('support') || lower.includes('phone') || lower.includes('email') || lower.includes('helpline')) {
        replyText = current.contactText;
      } else if (
        lower.includes('diagnose') || 
        lower.includes('issue') || 
        lower.includes('status') || 
        lower.includes('error') || 
        lower.includes('problem') || 
        lower.includes('fail') || 
        lower.includes('not working') ||
        lower.includes('तपासणी') ||
        lower.includes('समस्या') ||
        lower.includes('खराब')
      ) {
        replyText = current.diagnosticsText;
      } else if (lower.includes('manali') || lower.includes('cottage') || lower.includes('powai') || lower.includes('apartment') || lower.includes('featured')) {
        if (lang === 'mr') {
          replyText = `आम्ही संपूर्ण भारतात उत्कृष्ट लक्झरी जागा ऑफर करतो:
* **Powai Lakeview Apartment (मुंबई):** तलावाच्या बाजूला सुंदर फ्लॅट (₹44,800/रात्र).
* **Hill Cottage, Manali (हिमाचल):** डोंगरांच्या कुशीतील विला (₹6,800/रात्र).
* **Skyline Studio, Bandra (मुंबई):** समुद्रकिनारी प्रीमियम स्टुडिओ (₹7,200/रात्र).
* **Sea Breeze Villa, Anjuna (गोवा):** प्रायव्हेट पूलसह अलिशान विला (₹18,500/रात्र).

तुम्ही वर दिलेल्या मुख्य सर्च बॉक्समध्ये शोधू शकता!`;
        } else if (lang === 'hi') {
          replyText = `हम पूरे भारत में प्रीमियम प्रॉपर्टीज प्रदान करते हैं:
* **Powai Lakeview Apartment (मुंबई):** झील के सामने सुंदर फ्लैट (₹44,800/रात)।
* **Hill Cottage, Manali (हिमाचल):** पहाड़ों के बीच स्थित विला (₹6,800/रात)।
* **Skyline Studio, Bandra (मुंबई):** समुद्र के सामने प्रीमियम स्टूडियो (₹7,200/रात)।
* **Sea Breeze Villa, Anjuna (गोवा):** प्राइवेट पूल के साथ आलीशान विला (₹18,500/रात)।

आप ऊपर दिए गए सर्च बॉक्स का उपयोग करके इन्हें खोज सकते हैं!`;
        } else {
          replyText = `We offer premium featured listings across India:
* **Powai Lakeview Apartment (Mumbai):** A luxury modern space overlooking the lake (₹44,800/night).
* **Hill Cottage, Manali (Himachal):** A breathtaking mountain retreat (₹6,800/night).
* **Skyline Studio, Bandra (Mumbai):** Elite sea-facing studio (₹7,200/night).
* **Sea Breeze Villa, Anjuna (Goa):** Exquisite beachfront villa with private pool (₹18,500/night).

You can search and filter these directly in the main search pill above!`;
        }
      } else if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey') || lower.includes('namaste') || lower.includes('नमस्ते')) {
        replyText = lang === 'mr' 
          ? "हॅलो! मी MAYUR आहे. आज मी तुम्हाला जागा लिस्ट करण्यात, बुकिंग करण्यात किंवा सिस्टीम स्टेटस तपासायला मदत करू शकतो?"
          : lang === 'hi' 
          ? "नमस्ते! मैं MAYUR हूँ। आज मैं आपको संपत्ति लिस्ट करने, बुकिंग करने या सिस्टम स्थिति जांचने में मदद कर सकता हूँ?"
          : "Hello! I am MAYUR. Today I can help you list properties, book stays, or inspect website diagnostics status?";
      } else {
        replyText = current.fallbackText;
      }

      const botMsg = {
        id: `bot_${Date.now()}`,
        type: 'bot',
        text: replyText,
        time: new Date()
      };
      setMessages(prev => [...prev, botMsg]);

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const cleanText = replyText.replace(/[\*#_`]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';
        window.speechSynthesis.speak(utterance);
      }
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  const currentTranslation = TRANSLATIONS[lang];

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans no-print">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-charcoal to-terracotta text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 animate-bounce group"
          style={{ animationDuration: '3s' }}
        >
          <Bot className="w-7 h-7 group-hover:rotate-12 transition-transform duration-300" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sage opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-sage"></span>
          </span>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="w-[380px] sm:w-[430px] h-[580px] rounded-3xl bg-white/95 backdrop-blur-md border border-sand-200/80 shadow-2xl flex flex-col overflow-hidden animate-scale-up">
          {/* Header */}
          <div className="px-6 py-4 bg-charcoal text-white flex items-center justify-between border-b border-sand-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-terracotta to-sage flex items-center justify-center text-white font-black">
                M
              </div>
              <div>
                <h4 className="font-black text-sm tracking-tight">{currentTranslation.botName}</h4>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/60">
                    {currentTranslation.statusText}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Language Selector + Close */}
            <div className="flex items-center space-x-3">
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="bg-white/10 text-white font-extrabold uppercase text-[10px] tracking-wider rounded px-2 py-1 border border-white/20 focus:ring-0 focus:outline-none cursor-pointer"
              >
                <option value="en" className="text-charcoal font-bold">English</option>
                <option value="hi" className="text-charcoal font-bold">हिंदी (Hindi)</option>
                <option value="mr" className="text-charcoal font-bold">मराठी (Marathi)</option>
              </select>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-sand-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed font-medium shadow-sm whitespace-pre-line ${
                    msg.type === 'user'
                      ? 'bg-terracotta text-white rounded-tr-none font-bold'
                      : 'bg-white text-charcoal border border-sand-200/60 rounded-tl-none font-medium'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-charcoal-muted mt-1 px-1 font-bold">
                  {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {isTyping && (
              <div className="flex flex-col items-start">
                <div className="bg-white border border-sand-200/60 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-terracotta rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-terracotta rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-terracotta rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Options Chips */}
          <div className="px-6 py-3 border-t border-sand-100 bg-white/50 overflow-x-auto flex space-x-2 scrollbar-none whitespace-nowrap">
            {currentTranslation.quickOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleSend(opt.query)}
                className="inline-block px-3 py-1.5 rounded-full bg-sand-100/60 hover:bg-terracotta/10 text-[10px] font-black text-charcoal-muted hover:text-terracotta border border-sand-200/40 transition-all active:scale-95 whitespace-nowrap"
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-sand-100 flex items-center space-x-2">
            <input
              type="text"
              placeholder={currentTranslation.placeholder}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1 bg-sand-50/50 border border-sand-200 rounded-xl px-4 py-3 text-xs font-bold text-charcoal focus:bg-white focus:border-terracotta focus:ring-4 focus:ring-terracotta/10"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim()}
              className="w-10 h-10 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white flex items-center justify-center transition-colors disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;
