import { REFUND_POLICY_TEXT, REFUND_POLICY_SUMMARY } from '../utils/refundPolicyContent';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, Plus, RotateCcw, X, Star, MapPin, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { propertyAPI, cmsAPI, getImageUrl, PROPERTY_IMAGE_PLACEHOLDER } from '../services/api';
import { getPropertyUrl } from '../lib/propertySlug';

const BOT_NAME = 'X-Space360 Assistant';

/** The Gemini-style sparkle: blue, violet and rose. */
export const AiSparkle = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="xs-ai-spark" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#4285F4" />
        <stop offset="0.55" stopColor="#9B72CB" />
        <stop offset="1" stopColor="#D96570" />
      </linearGradient>
    </defs>
    <path d="M12 1.5c.6 5.6 4.9 9.9 10.5 10.5-5.6.6-9.9 4.9-10.5 10.5C11.4 16.9 7.1 12.6 1.5 12 7.1 11.4 11.4 7.1 12 1.5z" fill="url(#xs-ai-spark)" />
  </svg>
);

const FLOWS = {
  main: {
    message: "### **Welcome to X-Space360 Helpdesk!**\nHow can we assist you today? Please select your query area below to get started:",
    options: [
      { label: "How It Works (Booking & Listing Steps)", next: "how_it_works" },
      { label: "I am a Guest / Customer", next: "guest_main" },
      { label: "I am a Host / Property Owner", next: "host_main" },
      { label: "Grievance & Support Desk", next: "support" }
    ]
  },
  
  how_it_works: {
    message: "### **How X-Space360 Works** \nWhether you are looking to book a space or list your property, we make the process simple and transparent!\n\nSelect what you'd like to explore:",
    options: [
      { label: "How to Book a Space (Guest Steps)", next: "how_it_works_guest" },
      { label: "How to List Your Property (Host Steps)", next: "how_it_works_host" },
      { label: "Back to Main Menu", next: "main" }
    ]
  },
  how_it_works_guest: {
    message: "### **How to Book a Space (4 Simple Steps)** \n\n1. **Search & Discover**: Select your city, check-in/out dates, and guest count to find verified villas, workspaces, or event venues.\n2. **Choose & Review**: Explore HD photo galleries, pricing breakdown, rules, and host ratings.\n3. **Request or Instant Book**:\n   * **Instant Book (Zap Icon )**: Pay and get immediate confirmation.\n   * **Request Book**: Send booking request. Host confirms within 24 hrs.\n4. **Secure Payment**: Pay via Razorpay with 100% buyer protection and instant booking voucher!",
    options: [
      { label: "How to List Your Property (Host Steps)", next: "how_it_works_host" },
      { label: "Back to Main Menu", next: "main" }
    ]
  },
  how_it_works_host: {
    message: "### **How to List Your Property (3 Simple Steps)** \n\n1. **Register & Verify KYC**: Sign up as a host and upload basic documents (Aadhaar, PAN, Property Proof).\n2. **List Your Space**: Set your price, upload photos, add amenities, and block personal dates on calendar.\n3. **Receive Bookings & 100% Payout**: Host guests and get **100% payout with 0% platform commission** within 3 business days of check-out!",
    options: [
      { label: "How to Book a Space (Guest Steps)", next: "how_it_works_guest" },
      { label: "Back to Main Menu", next: "main" }
    ]
  },
  
  // ==================== GUEST FLOWS ====================
  guest_main: {
    message: "### **Guest Support Menu**\nExplore topics related to finding, booking, and managing your stays on X-Space360:",
    options: [
      { label: "How to Browse & Book?", next: "guest_booking" },
      { label: "Property Categories & Rules", next: "guest_categories" },
      { label: "Payments, Cancellations & Refunds", next: "guest_refunds" },
      { label: "Meet our CRM Team (Brokers/RM/BM)", next: "guest_crm_info" },
      { label: "How to Raise a Support Ticket?", next: "guest_tickets" },
      { label: "Back to Main Menu", next: "main" }
    ]
  },
  guest_booking: {
    message: "### **How to Book a Space**\nBooking is secure and straightforward:\n\n1. **Search**: Enter the city, dates, and number of guests on the search bar.\n2. **Filter**: Filter by Category (Residential, Commercial, or Event Venue) and property types.\n3. **Request**: Click **Book Now** to submit a booking request. \n4. **Approval**: The host has **24 hours** to approve your request. No charge is made until approved.\n5. **Payment**: Once approved, complete payment securely via Razorpay to confirm.",
    options: [
      { label: "Instant Booking vs Request", next: "guest_booking_instant" },
      { label: "Can I reschedule dates?", next: "guest_booking_reschedule" },
      { label: "Back to Guest Menu", next: "guest_main" }
    ]
  },
  guest_booking_instant: {
    message: "### **Instant Booking vs Request**\n* **Instant Booking**: Properties with a orange **Zap / Lightning icon** are active for instant booking. You pay immediately, and the booking is confirmed instantly without host approval.\n* **Booking Request**: Standard properties require the host to confirm availability. The request is active for **24 hours**. You are only billed after host approval.",
    options: [
      { label: "Can I reschedule dates?", next: "guest_booking_reschedule" },
      { label: "Back to Guest Menu", next: "guest_main" }
    ]
  },
  guest_booking_reschedule: {
    message: "### **Rescheduling Policy**\n* **Before Payment**: Simply cancel the booking request and submit a new one with your updated dates.\n* **After Payment**: Date modifications require the host's consent. Please contact your assigned **Relationship Manager (RM)** or support desk. If approved, we will adjust the reservation on the backend.",
    options: [
      { label: "Instant Booking vs Request", next: "guest_booking_instant" },
      { label: "Back to Guest Menu", next: "guest_main" }
    ]
  },
  guest_categories: {
    message: "### **Property Categories & Guidelines**\nWe list three premium categories:\n\n1. **Residential Stays**: Villas, Bungalows, Apartments, Studios, Private Houses, and Farmhouses.\n2. **Commercial Spaces**: Private Offices, Co-working Desks, Meeting Rooms, and Conference Rooms.\n3. **Event Venues**: Banquet Halls, Hotel Ballrooms, and Wedding Venues.\n\nChoose below to learn about specific rules:",
    options: [
      { label: "Rules for Events & Shoots", next: "guest_event_rules" },
      { label: "Long-term Workspace Discounts", next: "guest_workspace_discounts" },
      { label: "Back to Guest Menu", next: "guest_main" }
    ]
  },
  guest_event_rules: {
    message: "### **Event & Shoot Rules**\n* **Capacity Limit**: Exceeding the maximum capacity of a venue without permission will incur extra guest fees.\n* **Music & Noise**: Loud music, sound systems, and DJs must stop by **10:00 PM** in accordance with local regulations.\n* **Decor/Catering**: External caterers and decorators are allowed only after prior written approval from the host.",
    options: [
      { label: "Long-term Workspace Discounts", next: "guest_workspace_discounts" },
      { label: "Back to Guest Menu", next: "guest_main" }
    ]
  },
  guest_workspace_discounts: {
    message: "### **Workspace Long-term Discounts**\n* **Weekly Stays**: Save **10-15%** on booking co-working desks or private cabins for 7+ consecutive days.\n* **Monthly Stays**: Save up to **30%** on bookings of 30+ days.\n* **Corporate Rates**: Contact [customer.support@x-space360.com](mailto:customer.support@x-space360.com) for special bulk discounts for teams.",
    options: [
      { label: "Rules for Events & Shoots", next: "guest_event_rules" },
      { label: "Back to Guest Menu", next: "guest_main" }
    ]
  },
  guest_refunds: {
    message: REFUND_POLICY_SUMMARY,
    options: [
      { label: "How to claim a refund?", next: "guest_refund_claim" },
      { label: "Security Deposit refunds", next: "guest_security_refund" },
      { label: "Back to Guest Menu", next: "guest_main" }
    ]
  },
  guest_refund_claim: {
    message: "### **How to Claim Your Refund**\n1. Go to **My Bookings** and open the booking.\n2. Choose **Cancel Booking**, or contact customer support. A cancellation is valid once X-Space360 confirms it (within 24-48 working hours).\n3. The refund percentage follows the cancellation window above.\n4. Disagree with a decision? Submit a **refund review request within 7 days** of the cancellation and we will review it and share our final decision.",
    options: [
      { label: "Security Deposit refunds", next: "guest_security_refund" },
      { label: "Back to Guest Menu", next: "guest_main" }
    ]
  },
  guest_security_refund: {
    message: "### **Security Deposits and Damage**\n* **Collection**: some hosts may collect a security amount for higher-value properties. It is shown before you pay.\n* **Damage claims**: damage, nuisance or breach of house rules can lead to charges. Before any deduction or refund decision, X-Space360 may review evidence such as photos, chat history and payment records.\n* **Questions**: contact support with your booking ID.",
    options: [
      { label: "How to claim a refund?", next: "guest_refund_claim" },
      { label: "Back to Guest Menu", next: "guest_main" }
    ]
  },
  guest_crm_info: {
    message: "### **Our CRM Team (Brokers/RM/BM)**\nTo deliver a premium experience, X-Space360 employs a dedicated management team:\n\n* **Broker**: Local partner assigned to inspect properties, assist with site visits, and coordinate listing verify.\n* **Relationship Manager (RM)**: Your dedicated point of contact for issues related to check-in assistance, booking edits, and host disputes.\n* **Branch Manager (BM)**: The regional head supervising all RM and Broker activities, ensuring policy compliance.",
    options: [
      { label: "Back to Guest Menu", next: "guest_main" }
    ]
  },
  guest_tickets: {
    message: "### **Raising a Support Ticket**\nIf you face an issue during your stay, you can raise an official support ticket:\n\n1. Login to your account.\n2. Go to **Dashboard** $\\rightarrow$ **Support Tickets**.\n3. Click **Raise Support Ticket**.\n4. Enter a subject, description, and category.\n5. Our system automatically assigns a Relationship Manager (RM) who will contact you within **1 hour**.",
    options: [
      { label: "Back to Guest Menu", next: "guest_main" }
    ]
  },

  // ==================== HOST FLOWS ====================
  host_main: {
    message: "### **Host Support Menu**\nWelcome Host Partner! How can we help you manage your properties, bookings, or payouts?",
    options: [
      { label: "Host Onboarding & KYC", next: "host_onboarding" },
      { label: "Listing a Space & Calendar Blockouts", next: "host_listing" },
      { label: "Subscription Plans & Free Trial", next: "host_subscriptions" },
      { label: "Payouts, Earnings & 0% Commission", next: "host_payouts" },
      { label: "Host Support Team & Managers", next: "host_crm_info" },
      { label: "Back to Main Menu", next: "main" }
    ]
  },
  host_onboarding: {
    message: "### **Host Onboarding & KYC Verification**\nEvery listing goes live after account verification:\n\n1. Register as a Host on the [Registration Page](/register).\n2. Navigate to **Host Dashboard** $\\rightarrow$ **Verification** tab.\n3. Upload clear copies of: Aadhaar, PAN, Address Proof, and Municipal NOC/Shop Act.\n4. Admin reviews and approves KYC within 24-48 hours.",
    options: [
      { label: "Why is Shop Act mandatory?", next: "host_shop_act" },
      { label: "KYC Rejection reasons", next: "host_kyc_rejections" },
      { label: "Back to Host Menu", next: "host_main" }
    ]
  },
  host_shop_act: {
    message: "### **Shop Act License Requirement**\n* **Why is it required?**: Under local commercial laws, commercial leasing of event venues or short-term stays requires registration.\n* **Alternatives**: If you do not have a Shop Act, you can upload a **GST registration certificate**, **Property Tax receipt (commercial)**, or **NOC from the local Gram Panchayat/Municipality**.",
    options: [
      { label: "KYC Rejection reasons", next: "host_kyc_rejections" },
      { label: "Back to Host Menu", next: "host_main" }
    ]
  },
  host_kyc_rejections: {
    message: "### **Common KYC Rejection Reasons**\n1. **Blurred Images**: Re-upload clear, readable document files.\n2. **Name Mismatch**: The bank account owner name must match the Aadhaar and PAN.\n3. **Address Proof Mismatch**: Utility bill or lease deed must match the listing address.\n4. **Expired Document**: Ensure municipal licenses are current.",
    options: [
      { label: "Why is Shop Act mandatory?", next: "host_shop_act" },
      { label: "Back to Host Menu", next: "host_main" }
    ]
  },
  host_listing: {
    message: "### **Listing & Calendar Management**\nManaging your listings is quick and simple:\n\n* **Listing a Space**: Head to dashboard, click **+ List New Property**, set pricing, rules, upload photos, and pinpoint your location on the map.\n* **Calendar Blockouts**: Go to **Calendar** $\\rightarrow$ select dates $\\rightarrow$ click **Block Selected Dates** to prevent guest bookings during maintenance or personal use.\n* **Instant Booking**: Toggle this on to allow guests to book instantly without waiting for your manual approval.",
    options: [
      { label: "How to edit active listings?", next: "host_listing_edit" },
      { label: "Back to Host Menu", next: "host_main" }
    ]
  },
  host_listing_edit: {
    message: "### **Editing Active Listings**\n* **Instant Edits**: Go to **My Listings** $\\rightarrow$ click **Edit** to modify descriptions, change base prices, or toggle amenities instantly.\n* **Address changes**: Changing the map coordinates or street address will temporarily return the listing to a pending verification status for admin check.",
    options: [
      { label: "Back to Host Menu", next: "host_main" }
    ]
  },
  host_subscriptions: {
    message: "### **Hosting Fees & Subscription Plans**\n* **Promotional Offer**: Hosting on X-Space360 is **completely FREE until December 2026**! No subscription or registration fees apply.\n* **Post-Promo BHK Plans**: Standard BHK-specific plans (₹999/mo for Studio/1BHK, ₹1,999/mo for 2/3BHK) will commence starting January 2027.",
    options: [
      { label: "Subscription renewals post-promo", next: "host_sub_renewals" },
      { label: "Back to Host Menu", next: "host_main" }
    ]
  },
  host_sub_renewals: {
    message: "### **Subscription Renewal (Post-Promo)**\n* **Auto-Billing**: Subscriptions will auto-renew monthly via stored Razorpay credentials once active in 2027.\n* **Grace Period**: If renewal fails, you receive a **3-day grace period** to clear dues before listings are hidden.",
    options: [
      { label: "Back to Host Menu", next: "host_main" }
    ]
  },
  host_payouts: {
    message: "### **Payouts & Platform Commission**\n* **0% Host Commission**: X-Space360 does **not deduct any platform fees or commission** from your base rate. You receive **100%** of your listed price!\n* **Schedule**: Payouts are transferred to your verified bank account within **3 business days** after guest check-out.\n* **Government TDS**: 1% TDS is deducted under Section 194O of the IT Act (claimable in your annual ITR).",
    options: [
      { label: "GST & Tax Regulations", next: "host_tax_details" },
      { label: "Delayed Payout Troubleshooting", next: "host_delayed_payout" },
      { label: "Back to Host Menu", next: "host_main" }
    ]
  },
  host_tax_details: {
    message: "### **GST & Indian Tax Regulations**\n* **TDS under 194O**: As an e-commerce platform, we deduct **1% TDS** on the gross booking amount and file it against your PAN. You can claim this refund during your annual tax filing.\n* **GST**: Hosts are responsible for filing GST on renting commercial/residential properties if their annual turnover exceeds the threshold.",
    options: [
      { label: "Delayed Payout Troubleshooting", next: "host_delayed_payout" },
      { label: "Back to Host Menu", next: "host_main" }
    ]
  },
  host_delayed_payout: {
    message: "### **Delayed Payout Troubleshooting**\nIf your payout has not arrived in 3 business days, check the following:\n\n1. **Bank Details**: Ensure your IFSC code and account number are correct on your dashboard.\n2. **Bank Holidays**: Payouts are not processed on Saturdays, Sundays, and national holidays.\n3. **Guest Disputes**: If a guest files a dispute regarding amenities, payouts may be temporarily held until resolved.",
    options: [
      { label: "GST & Tax Regulations", next: "host_tax_details" },
      { label: "Back to Host Menu", next: "host_main" }
    ]
  },
  host_crm_info: {
    message: "### **Meet Your Management Team**\nTo assist hosts in managing listings, X-Space360 assigns a dedicated team:\n\n* **Local Broker**: Conducts physical verification, photographs the property, and answers local guest queries.\n* **Relationship Manager (RM)**: Helps hosts resolve booking conflicts, payout delays, and guest complaints.\n* **Branch Manager (BM)**: The regional leader supervising both Brokers and RMs, ensuring top-tier service.",
    options: [
      { label: "Back to Host Menu", next: "host_main" }
    ]
  },

  // ==================== SUPPORT FLOW ====================
  support: {
    message: "### **Contact X-Space360 Helpdesk**\nIf you need direct escalation or phone assistance, contact our support team:\n\n* **Helpline**: [+91 9225586010](tel:+919225586010) (9 AM - 7 PM)\n* **Email Support**: [customer.support@x-space360.com](mailto:customer.support@x-space360.com)\n* **Grievance Desk**: Email to [customer.support@x-space360.com](mailto:customer.support@x-space360.com) with booking ID.",
    options: [
      { label: "Main Menu", next: "main" }
    ]
  }
};

/* ----------------------------- understanding the question ----------------------------- */

// common short forms and spelling slips, fixed before anything else is read
const SLANG = {
  pls: 'please', plz: 'please', u: 'you', ur: 'your', r: 'are', wanna: 'want', gimme: 'give', cheep: 'cheap', cheapest: 'cheapest',
  vila: 'villa', vilas: 'villas', vlla: 'villa', villaa: 'villa', apartmnt: 'apartment', appartment: 'apartment', appartments: 'apartments',
  proprty: 'property', propertys: 'properties', porperty: 'property', prperty: 'property', propery: 'property',
  bokking: 'booking', bookin: 'booking', bking: 'booking', refnd: 'refund', refud: 'refund', canclation: 'cancellation', cancelation: 'cancellation',
  wifi: 'wifi', wi: 'wi', ppl: 'people', gust: 'guest', gusts: 'guests', guest: 'guest', nite: 'night', nights: 'nights',
  weekened: 'weekend', wekend: 'weekend', weekand: 'weekend', wkend: 'weekend', tomorow: 'tomorrow', tommorow: 'tomorrow',
  k: 'k', lakhs: 'lakh', lacs: 'lakh', lac: 'lakh',
};
const CITY_ALIASES = {
  nasik: 'nashik', nasick: 'nashik', puna: 'pune', poona: 'pune', bombay: 'mumbai', alibag: 'alibaug', alibagh: 'alibaug',
  lonavala: 'lonavla', lonavalaa: 'lonavla', mahabaleshwar: 'mahabaleshwar', panchgani: 'panchgani', karjat: 'karjat', igatpuri: 'igatpuri',
};

const normalize = (raw) => {
  let t = raw.toLowerCase().replace(/[’']/g, '').replace(/co[\s-]?working/g, 'coworking').replace(/check[\s-]?in/g, 'checkin').replace(/check[\s-]?out/g, 'checkout');
  t = t.replace(/[^a-z0-9.\sऀ-ॿ₹]/g, ' ');
  return t.split(/\s+/).filter(Boolean).map((w) => SLANG[w] || w).join(' ');
};
const tokensOf = (text) => text.split(/\s+/).filter(Boolean);

const distance = (a, b) => {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
    }
  }
  return rows[a.length][b.length];
};

const QUESTION_WORDS = new Set(['what', 'when', 'which', 'tell', 'show', 'give', 'does', 'have', 'with', 'about', 'there', 'this', 'that', 'rent', 'rate', 'near', 'many', 'much', 'more', 'less', 'some', 'same', 'here', 'then', 'them', 'they', 'your', 'please', 'want', 'need', 'from', 'into', 'over']);
const skeleton = (w) => w[0] + w.slice(1).replace(/[aeiouy]/g, '').replace(/(.)\1+/g, '$1');

/** Forgiving word match: spelling mistakes, swapped letters, "written the way it sounds", words run together. */
const sameWord = (token, keyword) => {
  if (token === keyword) return true;
  if (QUESTION_WORDS.has(token) || QUESTION_WORDS.has(keyword)) return false;
  if (token.length < 3 || keyword.length < 4) return false;
  if (keyword.length >= 5 && token.length >= 4 && (keyword.startsWith(token) || token.startsWith(keyword))) return true;
  if (token.length === keyword.length && token.length >= 4 && [...token].sort().join('') === [...keyword].sort().join('')) return true;
  if (token.length >= 4 && keyword.length >= 4 && token[0] === keyword[0]) {
    const a = skeleton(token);
    if (a.length >= 3 && a === skeleton(keyword)) return true;
  }
  if (token.length >= 9 && keyword.length >= 5 && token.includes(keyword)) return true;
  return distance(token, keyword) <= (keyword.length >= 8 ? 2 : keyword.length >= 5 ? 1 : token.length >= 4 ? 1 : 0);
};

const phraseCache = new Map();
/** Phrases are compared the way the question is cleaned up ("x-space" becomes "x space"). */
const phraseOf = (w) => {
  if (!phraseCache.has(w)) phraseCache.set(w, normalize(w));
  return phraseCache.get(w);
};

const hits = (tokens, text, words) => {
  // also try neighbouring words glued together, so "co work ing" or "check in" still count
  const glued = tokens.slice(1).map((t, i) => tokens[i] + t);
  return words.reduce((n, w) => {
    if (w.includes(' ')) return n + (text.includes(phraseOf(w)) ? 2 : 0);
    return n + (tokens.some((t) => sameWord(t, w)) || glued.some((t) => sameWord(t, w)) ? 1 : 0);
  }, 0);
};

/** Stricter word match for places, types and amenities: "booking" must never read as "cooking" or "works" as "workspace". */
const hitsStrict = (tokens, text, words) => words.reduce((n, w) => {
  if (w.includes(' ')) return n + (text.includes(w) ? 2 : 0);
  const exact = tokens.includes(w);
  const typo = !exact && w.length >= 6 && tokens.some((t) => t.length >= 5 && t[0] === w[0] && distance(t, w) <= 1);
  return n + (exact || typo ? 1 : 0);
}, 0);

// topic -> keywords (English, Hindi and Marathi written in English letters); the answer is the matching helpdesk flow
const TOPICS = [
  { key: 'support', words: ['contact', 'call', 'phone', 'number', 'email', 'mail', 'helpline', 'support', 'complaint', 'grievance', 'talk', 'human', 'agent', 'madat', 'sampark', 'whatsapp', 'customer care', 'baat', 'bolaycha', 'help me', 'speak'] },
  { key: 'how_it_works', words: ['how it works', 'how does x-space', 'how x-space', 'process', 'platform', 'xspace360 work', 'overview', 'kaise kaam', 'kasa chalta', 'who are you'] },
  { key: 'how_it_works_guest', words: ['steps', 'step', 'how to book', 'how do i book', 'search and book', 'kasa book', 'kaise book'] },
  { key: 'guest_booking', words: ['book', 'booking', 'reserve', 'reservation', 'bukking', 'approval', 'approve', 'booked'] },
  { key: 'guest_booking_instant', words: ['instant', 'request booking', 'confirm', 'confirmation', 'immediately', 'turant'] },
  { key: 'guest_booking_reschedule', words: ['reschedule', 'change date', 'change dates', 'modify', 'postpone', 'prepone', 'date change', 'date badal'] },
  { key: 'guest_categories', words: ['categories', 'category', 'guidelines', 'kinds', 'residential', 'what do you list', 'what types'] },
  { key: 'guest_event_rules', words: ['shoot', 'dj', 'music', 'catering', 'decor', 'decoration', 'noise', 'capacity', 'party rules', 'event rules', 'loud', 'sound'] },
  { key: 'guest_workspace_discounts', words: ['discount', 'discounts', 'monthly', 'weekly', 'long term', 'corporate', 'bulk', 'offer', 'offers', 'coupon', 'deal', 'deals', 'sale'] },
  { key: 'guest_refunds', words: ['refund', 'refunds', 'cancel', 'cancellation', 'cancelled', 'payment', 'payments', 'razorpay', 'money back', 'paise wapas', 'pay', 'charge', 'charges', 'fee', 'fees'] },
  { key: 'guest_security_refund', words: ['deposit', 'security deposit', 'damage', 'damages'] },
  { key: 'guest_crm_info', words: ['broker', 'brokers', 'relationship manager', 'crm', 'branch manager', 'rm'] },
  { key: 'guest_tickets', words: ['ticket', 'tickets', 'raise a ticket', 'raise ticket'] },
  { key: 'host_onboarding', words: ['host', 'hosting', 'register', 'registration', 'onboarding', 'signup', 'sign up', 'become a host', 'owner', 'earn', 'malik'] },
  { key: 'host_shop_act', words: ['shop act', 'licence', 'license', 'gumasta'] },
  { key: 'host_kyc_rejections', words: ['kyc', 'rejected', 'rejection', 'aadhaar', 'aadhar', 'verification', 'verify'] },
  { key: 'host_listing', words: ['list my', 'listing', 'list property', 'list a property', 'list your', 'add property', 'add my property', 'upload', 'post property', 'put my property'] },
  { key: 'host_listing_edit', words: ['edit', 'update listing', 'edit listing', 'change price', 'edit my'] },
  { key: 'host_subscriptions', words: ['subscription', 'subscriptions', 'plan', 'plans', 'membership', 'package'] },
  { key: 'host_sub_renewals', words: ['renew', 'renewal', 'renewals', 'expire', 'expired', 'expiry'] },
  { key: 'host_payouts', words: ['payout', 'payouts', 'commission', 'earnings', 'withdraw', 'settlement', 'bank', 'when will i get paid'] },
  { key: 'host_tax_details', words: ['tax', 'gst', 'tds', 'pan', 'invoice'] },
  { key: 'host_delayed_payout', words: ['delay', 'delayed', 'late payout', 'not received', 'pending payout'] },
];

const SEARCH_VERBS = ['show', 'find', 'search', 'suggest', 'recommend', 'looking', 'need', 'want', 'available', 'options', 'dhund', 'dakhav', 'dakhva', 'dakhao', 'dikhao', 'dikha', 'dikhaiye', 'pahije', 'hava', 'chahiye', 'near', 'best', 'cheap', 'cheapest', 'top', 'stay', 'stays', 'space', 'spaces', 'property', 'properties', 'place', 'places', 'room', 'rooms', 'accommodation', 'sasta', 'swast', 'luxury', 'premium', 'popular'];
const TYPE_WORDS = [
  { words: ['villa', 'villas', 'bungalow', 'bungalows', 'honeymoon', 'romantic', 'pool'], params: { property_type: 'villa' }, label: 'villas' },
  { words: ['apartment', 'apartments', 'flat', 'flats'], params: { property_type: 'apartment' }, label: 'apartments' },
  { words: ['studio', 'studios'], params: { property_type: 'studio' }, label: 'studios' },
  { words: ['farmhouse', 'farmhouses', 'farm'], params: { property_type: 'farmhouse' }, label: 'farmhouses' },
  { words: ['banquet', 'banquets', 'hall', 'halls'], params: { property_type: 'banquet_hall' }, label: 'banquet halls' },
  { words: ['wedding', 'weddings', 'venue', 'venues', 'reception', 'engagement'], params: { property_type: 'wedding_venue' }, label: 'wedding venues' },
  { words: ['coworking', 'cowork', 'workspace', 'workspaces', 'desk', 'desks', 'startup'], params: { property_type: 'co_working' }, label: 'co-working spaces' },
  { words: ['office', 'offices'], params: { property_type: 'private_office' }, label: 'private offices' },
  { words: ['meeting', 'conference', 'boardroom', 'offsite'], params: { property_type: 'meeting_room' }, label: 'meeting rooms' },
  { words: ['rooftop', 'terrace'], params: { property_type: 'rooftop' }, label: 'rooftop venues' },
  { words: ['commercial'], params: { category: 'commercial' }, label: 'commercial spaces' },
];
const AMENITY_WORDS = [
  { slug: 'wifi', words: ['wifi', 'internet', 'broadband'] },
  { slug: 'ac', words: ['aircon', 'airconditioning', 'ac'] },
  { slug: 'parking', words: ['parking', 'garage'] },
  { slug: 'kitchen', words: ['kitchen', 'cooking'] },
  { slug: 'gym', words: ['gym', 'fitness'] },
  { slug: 'tv', words: ['smarttv', 'television'] },
  { slug: 'bar', words: ['bar', 'lounge'] },
  { slug: 'catering', words: ['catering'] },
  { slug: 'live_music', words: ['dj', 'livemusic'] },
  { slug: 'indoor_games', words: ['indoor games', 'games'] },
  { slug: 'birthday_celebration', words: ['birthday'] },
];
const CHEAP_WORDS = ['cheap', 'cheapest', 'cheaper', 'lowest', 'affordable', 'sasta', 'swast', 'economical', 'budget', 'kam', 'lower'];
const LUXURY_WORDS = ['luxury', 'luxurious', 'premium', 'expensive', 'costliest', 'mahag', 'mehnga', 'highest', 'costlier', 'royal'];
const BEST_WORDS = ['best', 'top', 'rated', 'rating', 'popular', 'famous', 'favourite', 'favorite', 'bestseller'];
const NEW_WORDS = ['newest', 'latest', 'recent', 'new'];
const MORE_WORDS = ['more', 'another', 'others', 'other', 'next', 'else', 'different', 'aur', 'ajun'];

/** "under 5000", "below 8k", "within 1.5 lakh", "5000 chya khali", "budget 20000" -> rupees per night */
const budgetFrom = (question) => {
  const t = question.toLowerCase().replace(/,/g, '');
  const m = t.match(/(?:under|below|less than|upto|up to|within|max(?:imum)?|budget(?: of)?|around|not more than|tak|se kam)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(k|thousand|l|lac|lacs|lakh|lakhs)?/)
    || t.match(/(?:rs\.?|inr|₹)\s*(\d+(?:\.\d+)?)\s*(k|thousand|l|lac|lacs|lakh|lakhs)?/)
    || t.match(/(\d+(?:\.\d+)?)\s*(k|thousand|lakh|lakhs)?\s*(?:chya khali|ke andar|ke niche|tak|or less|and below|max)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = m[2] || '';
  const mult = /^(l|lac|lakh)/.test(unit) ? 100000 : /^(k|thousand)/.test(unit) ? 1000 : 1;
  const value = n * mult;
  return value >= 500 ? value : null;
};

const rupees = (n) => `₹${Math.round(Number(n || 0)).toLocaleString('en-IN')}`;
const priceOf = (p) => Math.round(Number(p?.display_price_per_night ?? p?.customer_price_per_night ?? p?.price_per_night ?? p?.price ?? 0));
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const nextWeekend = () => {
  const d = new Date();
  const toSat = (6 - d.getDay() + 7) % 7 || 7;
  const sat = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (d.getDay() === 6 ? 0 : toSat));
  const sun = new Date(sat.getFullYear(), sat.getMonth(), sat.getDate() + 1);
  return { check_in: iso(sat), check_out: iso(sun), label: 'this weekend' };
};

let catalogCache = null;
/** All live listings once: names, cities and types the assistant can recognise. */
const loadCatalog = async () => {
  if (catalogCache) return catalogCache;
  try {
    const res = await propertyAPI.searchProperties({ limit: 100 });
    const list = Array.isArray(res.data) ? res.data : res.data?.properties || [];
    catalogCache = {
      list,
      total: Array.isArray(res.data) ? list.length : res.data?.total || list.length,
      cities: [...new Set(list.map((p) => String(p.city || '').trim()).filter(Boolean))],
    };
  } catch (e) {
    catalogCache = { list: [], total: 0, cities: [] };
  }
  return catalogCache;
};

const findCity = (text, tokens, cities) => {
  for (const city of cities) {
    if (text.includes(city.toLowerCase())) return { city, corrected: false };
  }
  for (const token of tokens) {
    const alias = CITY_ALIASES[token];
    if (alias) {
      const hit = cities.find((c) => c.toLowerCase() === alias);
      if (hit) return { city: hit, corrected: true };
    }
  }
  for (const token of tokens) {
    if (token.length < 4 || QUESTION_WORDS.has(token)) continue;
    for (const city of cities) {
      const words = city.toLowerCase().split(/\s+/);
      if (words.some((w) => w.length >= 4 && sameWord(token, w) && distance(token, w) <= 2)) return { city, corrected: true };
    }
  }
  return null;
};

const findProperty = (tokens, text, list) => {
  const skip = new Set(['villa', 'villas', 'resort', 'the', 'and', 'with', 'price', 'about', 'details', 'tell', 'show', 'show', 'book', 'booking', 'space', 'stay', 'near', 'park', 'valley']);
  let best = null;
  list.forEach((p) => {
    const title = String(p.title || '').toLowerCase();
    if (!title) return;
    if (text.includes(title)) { best = { p, score: 99 }; return; }
    const words = title.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 4 && !skip.has(w));
    const matched = words.filter((w) => tokens.some((t) => t.length >= 4 && sameWord(t, w))).length;
    if (matched >= 2 || (matched === 1 && words.length === 1)) {
      if (!best || matched > best.score) best = { p, score: matched };
    }
  });
  return best?.p || null;
};

const flowReply = (key) => {
  const flow = FLOWS[key] || FLOWS.main;
  return {
    text: flow.message,
    followUps: (flow.options || []).map((o) => ({ label: o.label, next: o.next })),
  };
};

/* ---------------- policies: read from the same CMS text the Terms, Privacy and Refund pages show ---------------- */

const DOC_LINKS = {
  refund: { label: 'Read the full Refund Policy', href: '/refund-policy' },
  terms: { label: 'Read the full Terms & Conditions', href: '/terms' },
  privacy: { label: 'Read the full Privacy Policy', href: '/privacy-policy' },
  faq: { label: 'Open the Help Center', href: '/support' },
};

// Support Help Center answers (same wording as the Support page)
const FAQ_ENTRIES = [
  { id: 'faq-add-property', source: 'faq', label: 'How to list a new property', words: ['how to list', 'list a new property', 'list new property', 'add new property', 'add a property', 'list my property'], text: "Log in to your host account, open your Dashboard and click **+ List New Property**. A step-by-step form asks for the category, location, details, rates and amenities. If your documents are not verified yet, you will be asked to submit them first." },
  { id: 'faq-kyc-docs', source: 'faq', label: 'Documents needed for host verification', words: ['documents required', 'kyc documents', 'which documents', 'document list', 'host verification', 'verification documents', 'kyc'], text: "To get verified as a host you upload:\n\n1. Aadhaar Card\n2. PAN Card\n3. Property ownership proof\n4. Electricity bill (matching the property address)\n5. Shop Act License (mandatory)\n\nA GST certificate is optional and can be added if it applies to you." },
  { id: 'faq-shop-act', source: 'faq', label: 'Is the Shop Act License mandatory?', words: ['shop act', 'shop act license', 'shop licence', 'shop license'], text: "Yes. The Shop Act License is a **mandatory** document in host verification (marked with a red asterisk). Upload a valid copy to submit your account for verification. GST certificates stay optional." },
  { id: 'faq-billing', source: 'faq', label: 'Subscription and billing for hosts', words: ['subscription', 'subscriptions', 'billing', 'plans', 'plan', 'registration fee', 'monthly plan', 'annual plan'], text: "Hosts choose from subscription plans by property size (Studio, 1 BHK, 2 BHK and so on) with monthly or annual billing. The registration fee and plan selection are managed in the **Subscription Billing** tab of your host account." },
  { id: 'faq-profile', source: 'faq', label: 'Update profile or payout details', words: ['update profile', 'payout details', 'bank details', 'change bank', 'payout preferences', 'profile settings', 'account settings'], text: "Open your Host Dashboard, go to **Account / Settings** and update your personal information or bank details. Payouts are processed securely according to the payout cycle chosen in your preferences tab." },
];

// What the platform does, written from the product itself (pages, dashboards and policies), so people can ask about any detail.
const INFO = [
  { id: 'info-about', label: 'What is X-Space360', words: ['what is x-space360', 'what is x-space', 'what is xspace', 'about x-space360', 'about xspace', 'who are you', 'who runs', 'company', 'golden rich', 'goldenrich', 'owner of x-space360', 'who owns'], link: { label: 'About us', href: '/about-us' },
    text: "X-Space360 is a short-term rental marketplace run by **Golden Rich Financial & Real Estate Solutions Private Limited**, based in Nashik, Maharashtra.\n\nIt lists three kinds of spaces:\n\n* **Residential stays**: villas, bungalows, apartments, studios, farmhouses and private houses\n* **Commercial spaces**: private offices, co-working desks, meeting rooms and conference rooms\n* **Event venues**: banquet halls, wedding venues, hotel ballrooms and rooftops\n\nGuests browse and book, hosts list and manage their spaces, and our team verifies listings and helps with support." },
  { id: 'info-channel-manager', label: 'Do you have a channel manager', words: ['channel manager', 'channel management', 'ota', 'otas', 'ota sync', 'airbnb', 'booking.com', 'bookingcom', 'makemytrip', 'mmt', 'agoda', 'vrbo', 'ical', 'calendar sync', 'sync calendar', 'sync with airbnb', 'double booking', 'overbooking', 'two way sync'], link: { label: 'List your property', href: '/list-your-property' },
    text: "Yes. X-Space360 has its own **Channel Manager** inside the host dashboard. It keeps your calendar in step with other booking sites using iCal links, so a stay sold elsewhere blocks the same dates here.\n\nIts tabs are **Reservations, Calendar, Availability, OTA Integrations, How It Works** and **Price Engine**.\n\n* **Works with:** Airbnb, Booking.com, MakeMyTrip, Agoda, Vrbo and any other site that gives an iCal link (Custom iCal)\n* **Auto-sync:** every 15 minutes, every 30 minutes, hourly, every 6 hours or daily, your choice per link\n* **Two directions:** you import the OTA calendar into X-Space360, and you copy the X-Space360 export link into the OTA so our bookings block their calendar too\n* **Manual sync:** a **Sync Now** button and a clear status message if a link fails\n\nIt syncs availability (blocked and booked dates). Prices are set with the Price Engine here." },
  { id: 'info-ota-steps', label: 'How to connect Airbnb or Booking.com', words: ['connect airbnb', 'connect booking', 'link airbnb', 'add ota', 'ota link', 'import url', 'export link', 'how to sync', 'sync now', 'ota integration', 'ota integrations'], link: null,
    text: "To connect another booking site:\n\n1. **Copy the import link** from the OTA (calendar settings in Airbnb, Booking.com, MakeMyTrip, Agoda, Vrbo or another iCal provider).\n2. **Connect one property:** in Channel Manager, open **OTA Integrations**, pick the exact X-Space360 listing, name the link, paste the OTA URL and choose how often to sync.\n3. **Export our availability:** copy the generated X-Space360 export link and add it as an imported calendar in the OTA dashboard.\n4. **Monitor:** imported reservations block this property's calendar. If an OTA booking is changed or cancelled, do it on that OTA and press **Sync Now**." },
  { id: 'info-price-engine', label: 'Dynamic pricing and the Price Engine', words: ['price on weekend', 'price on weekends', 'prices on weekends', 'weekend rates', 'weekend rate', 'higher price on', 'price engine', 'dynamic pricing', 'dynamic price', 'weekend pricing', 'weekend price', 'seasonal pricing', 'season pricing', 'festival pricing', 'peak pricing', 'pricing rule', 'pricing rules', 'surge', 'rate rule', 'increase price', 'change prices', 'bulk price', 'update prices'], link: null,
    text: "The **Price Engine** lets hosts set a price once and have it applied automatically.\n\n* **Weekend pricing:** a separate percentage for Saturday and Sunday\n* **Season or event rules:** a named rule for a date range (festival, long weekend, peak season)\n* **Custom rules** for any other dates\n* **Increase or decrease** by a percentage or by a flat rupee amount\n* **Scope:** one property, selected properties or all of them\n* **Update Prices:** raise or lower the base price of many listings by a percentage in one go\n\nGuests see the adjusted nightly price in the date picker, with higher and lower rates marked." },
  { id: 'info-host-tools', label: 'What the host dashboard offers', words: ['host dashboard', 'host features', 'host tools', 'host panel', 'host portal', 'manage my property', 'manage bookings', 'host calendar', 'block dates', 'block date', 'host performance', 'occupancy', 'earnings'], link: { label: 'List your property', href: '/list-your-property' },
    text: "The host workspace has:\n\n* **Dashboard:** your listings and a summary of activity\n* **Bookings:** approve or reject requests and track confirmed stays\n* **Calendar:** see bookings and block dates for personal use or maintenance\n* **Pricing and Price Engine:** base rates, weekend and seasonal rules\n* **Channel Manager:** sync with Airbnb, Booking.com and others\n* **Payouts:** earnings and payout status\n* **Performance:** monthly earnings, upcoming payouts, occupancy rate, cancellation rate and guest rating\n* **Support:** a help widget and support tickets" },
  { id: 'info-units', label: 'Listing several units in one property', words: ['one building', 'in one building', 'in one property', 'studios in one', 'apartments in one', 'list 5', 'list many', 'many units', 'units', 'multiple units', 'several units', 'rooms in one property', 'studio plan', 'single property', 'unit wise', 'per unit', 'many apartments', 'apartment building', 'list multiple'], link: null,
    text: "When you list a property you choose the **listing type**:\n\n* **Single property:** one space with one price\n* **Units:** one property with several units, such as studios or apartments in a building. Each unit has its own name, area, guest capacity, BHK and price.\n\nGuests pick a unit before booking. Prices, the date calendar and availability then follow the selected unit, and listing cards show \"Starting from\" the lowest unit price." },
  { id: 'info-search', label: 'How to search and filter', words: ['filters', 'filter', 'how to search', 'search properties', 'sort by', 'map view', 'split view', 'grid view', 'amenities filter', 'pet friendly filter', 'price filter', 'discover page', 'browse'], link: { label: 'Open Discover', href: '/guest/browse' },
    text: "On **Discover** you can search by place, property name or landmark, pick dates and guests, and narrow results with **Filters**:\n\n* Category and property type (villa, apartment, studio, farmhouse, banquet hall, co-working and more)\n* Size or BHK\n* Price range\n* Amenities such as WiFi, AC, parking, kitchen, gym, TV, fireplace, rooftop, bar, AV system, stage, catering, live music and indoor games\n* **Instant booking** and **pet friendly**\n\nSort by **Recommended, Price low to high, Price high to low** or **Newest**, and switch between **grid, split and map** views." },
  { id: 'info-series', label: 'What is the X-Space Series', words: ['what is x-space series', 'about x-space series', 'x-space series', 'xspace series', 'signature', 'signature villas', 'premium villas', 'luxury villas', 'series villas'], link: { label: 'See the X-Space Series', href: '/guest/browse?signature=true' },
    text: "The **X-Space Series** is our signature collection: private villas priced from **₹50,000 per night** upwards, curated for elevated weekends and unhurried stays. Look for the black and gold ribbon on a card or open the collection from Discover." },
  { id: 'info-wishlist', label: 'Wishlist and sharing', words: ['wishlist', 'wish list', 'save property', 'favourite', 'favorite', 'heart', 'share property', 'share link'], link: null,
    text: "Tap the **heart** on any card to save it to your wishlist (you need to be signed in as a guest). On Discover you can switch to show only your wishlist. Every property also has a **Share** button that copies a link you can send to friends." },
  { id: 'info-reviews', label: 'Ratings and reviews', words: ['review', 'reviews', 'rating', 'ratings', 'rate my stay', 'write a review', 'feedback', 'stars'], link: null,
    text: "Guests can review a stay when:\n\n* the booking is **confirmed and paid**\n* it is their own booking\n* it is within **14 days after check-out**\n* there is only **one review per booking**\n\nReviews update the property's star rating and count, which you see on listing cards." },
  { id: 'info-coupons', label: 'Coupons and discount codes', words: ['coupon', 'coupons', 'promo code', 'promo', 'discount code', 'voucher', 'diwali2026', 'apply code'], link: null,
    text: "We run two kinds of coupons: **booking coupons** (for guests) and **subscription coupons** (for hosts buying a plan). A coupon gives either a **fixed amount**, a **percentage** or a **target price**, and can be limited to a property, plan, category, property type or BHK. Enter the code when you pay; the discount shows before you confirm." },
  { id: 'info-roles', label: 'Who uses X-Space360', words: ['user roles', 'roles', 'broker', 'employee', 'admin', 'managing director', 'account types', 'types of users', 'broker dashboard', 'employee dashboard'], link: null,
    text: "There are five account types:\n\n* **Guest:** browses, books and reviews\n* **Host:** lists and manages spaces\n* **Broker:** lists properties on behalf of owners, tracks leads, tasks, bookings and analytics, and submits listings for verification\n* **Employee:** reviews and approves or rejects host and property verifications, and supports brokers and hosts\n* **Admin:** manages the platform, plans, coupons, content, support and reports" },
  { id: 'info-booking-status', label: 'Booking statuses', words: ['booking status', 'status of booking', 'pending booking', 'awaiting approval', 'booking rejected', 'booking confirmed', 'booking completed', 'my bookings'], link: null,
    text: "A booking moves through these statuses:\n\n* **Pending / Awaiting host approval:** your request is with the host (they have 24 hours)\n* **Confirmed:** approved and paid\n* **Completed:** the stay is over\n* **Rejected:** the host declined\n* **Cancelled:** cancelled by the guest or host\n\nYou can follow all of them under **My Bookings**." },
  { id: 'info-cancel-policy-types', label: 'Flexible, moderate and strict policies', words: ['flexible policy', 'moderate policy', 'strict policy', 'cancellation type', 'cancellation types', 'which cancellation'], link: { label: 'Read the full Refund Policy', href: '/refund-policy' },
    text: REFUND_POLICY_SUMMARY },
  { id: 'info-notifications', label: 'Notifications and alerts', words: ['notification', 'notifications', 'alerts', 'sms', 'whatsapp updates', 'email updates', 'booking updates', 'otp'], link: null,
    text: "You get booking updates, verification messages and support replies in the **notification centre** inside the app. OTPs and important alerts also reach you by **SMS, WhatsApp and email** through our messaging partner MSG91." },
  { id: 'info-app', label: 'Mobile app', words: ['mobile app', 'android app', 'play store', 'google play', 'download app', 'ios app', 'iphone app', 'app download', 'qr code'], link: { label: 'Get the app', href: 'https://play.google.com/store/apps/details?id=com.xspace360.app&pcampaignid=web_share' },
    text: "The **X-Space360 Android app** is on Google Play. Use the **Download App** button in the top bar (it shows a QR code you can scan) or the link below. Guests and hosts use the same account on the website and the app." },
  { id: 'info-languages', label: 'Languages', words: ['language', 'languages', 'hindi', 'marathi', 'english', 'change language'], link: null,
    text: "The site is available in **English, Hindi and Marathi**. Use the language selector in the top bar to switch. Your choice is remembered on this device." },
  { id: 'info-support-center', label: 'Help Center and support tickets', words: ['help center', 'support page', 'raise ticket', 'support ticket', 'complaint ticket', 'ticket status', 'faq', 'faqs', 'contact form'], link: { label: 'Open the Help Center', href: '/support' },
    text: "The **Help Center** has common questions for guests and hosts, and a form to raise a **support ticket**. For urgent help call **+91 9225586010** (9 AM to 7 PM) or write to **customer.support@x-space360.com** with your booking ID." },
  { id: 'info-payments', label: 'How payment works', words: ['how to pay', 'payment methods', 'payment mode', 'upi', 'credit card', 'debit card', 'net banking', 'netbanking', 'payment gateway', 'pay online', 'payment failed', 'payment fails', 'payment fail', 'payment pending', 'money debited', 'amount deducted', 'payment not working'], link: null,
    text: "Payments are taken online through **Razorpay**: UPI, credit and debit cards and net banking. We never store card numbers, UPI PINs or CVV. Standard properties are charged after the host approves your request; **Instant Booking** properties are charged right away and confirmed immediately. If a payment fails or stays pending, check My Bookings first and contact support with the booking ID if the money was debited." },
  { id: 'info-hourly', label: 'Single-day and hourly bookings', words: ['hourly', 'per hour', 'day use', 'one day booking', 'single day', 'same day booking', 'meeting room booking'], link: null,
    text: "For some commercial spaces, such as meeting and conference rooms, you can pick a **single date** instead of a check-in and check-out range. Choose the date in the calendar and the price for that day is shown before you confirm." },
  { id: 'info-checkin', label: 'Check-in time and ID', words: ['check in time', 'checkin time', 'check out time', 'checkout time', 'what time check', 'arrival time', 'government id', 'id proof', 'id required', 'documents at check in'], link: null,
    text: "Standard **check-in starts at 2:00 PM**. Please carry a valid **government ID** and show it on arrival. The exact check-in and check-out times, house rules and occupancy limit of a property are set by the host and shown on that property's page before you book." },
  { id: 'info-blog', label: 'Blog and About us', words: ['blog', 'articles', 'travel guide', 'about us page', 'careers', 'press'], link: { label: 'Open the blog', href: '/blog' },
    text: "Our **Blog** has travel ideas, destination guides and hosting tips, and the **About Us** page tells the X-Space360 story. Both are linked in the footer." },
];

// which section of each policy answers which question
const ENTRY_RULES = [
  // Refund & Cancellation Policy
  { source: 'refund', test: /general refund/i, id: 'refund-general', label: 'How refunds work', words: ['refund', 'refunds', 'original payment', 'refunded', 'money back', 'paise wapas', 'parat'] },
  { source: 'refund', test: /guest cancellation/i, id: 'refund-guest-cancel', label: 'Guest cancellation and refund percentage', words: ['guest cancellation', 'cancel', 'cancellation', 'cancelled', 'cancel booking', 'refund percentage', 'cancellation charges', 'rad', 'cancel kasa'] },
  { source: 'refund', test: /host cancellation/i, id: 'refund-host-cancel', label: 'If the host cancels', words: ['host cancels', 'host cancel', 'host cancelled', 'host cancellation', 'host canceled'] },
  { source: 'refund', test: /unavailab/i, id: 'refund-unavailable', label: 'If the property is unavailable', words: ['unavailable', 'double booking', 'property not available', 'maintenance', 'not available'] },
  { source: 'refund', test: /no show/i, id: 'refund-no-show', label: 'No show', words: ['no show', 'noshow', 'did not arrive', 'not arrive', 'not reach', 'unreachable'] },
  { source: 'refund', test: /same-day/i, id: 'refund-same-day', label: 'Same-day cancellation', words: ['same day', 'same-day', 'check-in day', 'checkin day', 'on the day'] },
  { source: 'refund', test: /early check/i, id: 'refund-early-checkout', label: 'Early check-out', words: ['early checkout', 'early check-out', 'leave early', 'checkout early', 'check out early', 'unused nights'] },
  { source: 'refund', test: /non-refundable bookings/i, id: 'refund-nonrefundable-bookings', label: 'Non-refundable bookings', words: ['non refundable', 'nonrefundable', 'non-refundable', 'promotional booking', 'discounted booking'] },
  { source: 'refund', test: /processing timeline/i, id: 'refund-timeline', label: 'Refund timeline', words: ['how long', 'refund take', 'take to refund', 'how many days', 'refund timeline', 'refund time', 'when will i get', 'credited', 'days to refund', 'refund status', 'kitne din', 'kiti divas'] },
  { source: 'refund', test: /force majeure/i, id: 'refund-force-majeure', label: 'Force majeure', words: ['force majeure', 'natural disaster', 'pandemic', 'government restriction', 'emergency', 'flood', 'covid', 'lockdown'] },
  { source: 'refund', test: /payment method/i, id: 'refund-method', label: 'Refund payment method', words: ['refund method', 'cash refund', 'original source', 'refund to', 'which account', 'refund mode'] },
  { source: 'refund', test: /non-refundable charges/i, id: 'refund-charges', label: 'Non-refundable charges', words: ['convenience fee', 'gateway charges', 'payment gateway', 'service fee', 'non refundable charges', 'taxes refund', 'platform fee'] },
  { source: 'refund', test: /fraud/i, id: 'refund-fraud', label: 'Fraudulent bookings', words: ['fraud', 'fraudulent', 'fake booking', 'false identity', 'fake documents'] },
  { source: 'refund', test: /cancellation process/i, id: 'refund-process', label: 'How to cancel a booking', words: ['how to cancel', 'cancel process', 'my bookings', 'cancel my booking', 'cancel kasa karu', 'cancel kaise'] },
  { source: 'refund', test: /dispute/i, id: 'refund-dispute', label: 'Refund dispute or review', words: ['refund dispute', 'disagree', 'refund review', 'appeal', 'not satisfied', 'wrong refund', 'review request'] },
  // Terms & Conditions
  { source: 'terms', test: /platform scope/i, id: 'terms-scope', label: 'What X-Space360 is', words: ['platform scope', 'marketplace', 'ownership', 'tenancy', 'leasehold', 'what does x-space', 'scope'] },
  { source: 'terms', test: /account registration/i, id: 'terms-account', label: 'Account rules', words: ['account rules', 'registration rules', 'credentials', 'password', 'otp', 'account suspend', 'account suspended', 'account blocked'] },
  { source: 'terms', test: /host listing/i, id: 'terms-host', label: 'Host responsibilities', words: ['host responsibilities', 'host responsibility', 'host rules', 'host obligations', 'host terms', 'host duties', 'owner rules', 'host policy', 'host policies', 'host guidelines'] },
  { source: 'terms', test: /guest booking/i, id: 'terms-guest', label: 'Guest responsibilities', words: ['guest responsibilities', 'guest responsibility', 'guest rules', 'guest terms', 'house rules', 'guest duties', 'guest policy', 'guest policies', 'id proof', 'occupancy', 'damage', 'nuisance'] },
  { source: 'terms', test: /payments, fees/i, id: 'terms-payments', label: 'Fees, taxes and payouts', words: ['fees', 'taxes', 'tax', 'commission', 'convenience', 'payout deduction', 'deductions', 'charges', 'gst'] },
  { source: 'terms', test: /cancellations, refunds, and disputes/i, id: 'terms-disputes', label: 'Disputes and evidence', words: ['complaint', 'complaints', 'evidence', 'payout hold', 'host breach', 'service failure', 'dispute resolution'] },
  { source: 'terms', test: /verification, documents/i, id: 'terms-verification', label: 'Verification and documents', words: ['verification consent', 'forged', 'document verification', 'fake document', 'documents consent'] },
  { source: 'terms', test: /prohibited/i, id: 'terms-prohibited', label: 'Prohibited conduct', words: ['prohibited', 'not allowed', 'banned', 'off platform', 'off-platform', 'fake review', 'fake reviews', 'illegal', 'misuse', 'bypass'] },
  { source: 'terms', test: /content, communications/i, id: 'terms-content', label: 'Content and intellectual property', words: ['copyright', 'intellectual property', 'photos usage', 'logo', 'content rights', 'my photos'] },
  { source: 'terms', test: /limitation of liability/i, id: 'terms-liability', label: 'Liability and indemnity', words: ['liability', 'liable', 'indemnity', 'responsible for', 'loss', 'compensation'] },
  { source: 'terms', test: /suspension, termination/i, id: 'terms-termination', label: 'Suspension and termination', words: ['terminate', 'termination', 'suspended', 'suspension', 'delist', 'delisted', 'policy changes', 'policy update', 'account ban', 'banned account'] },
  { source: 'terms', test: /governing law/i, id: 'terms-law', label: 'Governing law', words: ['governing law', 'jurisdiction', 'court', 'legal action', 'law applies', 'nashik court'] },
  // Privacy Policy (paragraphs)
  { source: 'privacy', test: /collects and processes/i, id: 'privacy-data', label: 'What data we collect', words: ['data collect', 'what data', 'personal data', 'information collect', 'my information', 'collect my', 'data kon', 'data safety'] },
  { source: 'privacy', test: /msg91/i, id: 'privacy-msg91', label: 'SMS, OTP and WhatsApp (MSG91)', words: ['msg91', 'sms', 'otp data', 'whatsapp data', 'notifications', 'read my sms'] },
  { source: 'privacy', test: /razorpay for payment/i, id: 'privacy-razorpay', label: 'Payment data (Razorpay)', words: ['razorpay', 'card details', 'card number', 'upi pin', 'cvv', 'payment data', 'payment safe', 'card stored'] },
  { source: 'privacy', test: /may share relevant/i, id: 'privacy-sharing', label: 'Who we share data with', words: ['share data', 'sharing', 'third party', 'third parties', 'sell my data', 'data shared', 'who sees'] },
  { source: 'privacy', test: /permanently request/i, id: 'privacy-deletion', label: 'Delete my account and data', words: ['delete account', 'delete my account', 'account deletion', 'delete my data', 'remove my account', 'erase', 'close account', 'deactivate'] },
  { source: 'privacy', test: /may be retained after/i, id: 'privacy-retained', label: 'What stays after deletion', words: ['retained', 'after deletion', 'keep my data', 'records kept', 'stored after'] },
  { source: 'privacy', test: /retention periods/i, id: 'privacy-retention', label: 'How long data is kept', words: ['retention', 'how long data', 'kept for', 'years data', 'data kept'] },
  { source: 'privacy', test: /users must ensure/i, id: 'privacy-security', label: 'Security and privacy contact', words: ['data secure', 'security safeguards', 'privacy contact', 'privacy request', 'data correction', 'correct my data'] },
];

// overview answers for "terms and conditions", "privacy policy", "refund policy"
const OVERVIEWS = [
  { id: 'overview-refund', source: 'refund', label: 'Cancellation & Refund Policy', words: ['refund policy', 'cancellation policy', 'refund and cancellation', 'cancellation and refund', 'refund terms'], pick: ['refund-guest-cancel', 'refund-timeline', 'refund-host-cancel', 'refund-no-show', 'refund-process'] },
  { id: 'overview-terms', source: 'terms', label: 'Terms & Conditions', words: ['terms and conditions', 'terms conditions', 'terms', 'tnc', 'conditions', 'rules', 'policies', 'policy'], pick: ['terms-host', 'terms-guest', 'terms-payments', 'terms-prohibited', 'terms-liability'] },
  { id: 'overview-privacy', source: 'privacy', label: 'Privacy Policy', words: ['privacy', 'privacy policy', 'my data', 'data privacy', 'personal information'], pick: ['privacy-data', 'privacy-razorpay', 'privacy-deletion', 'privacy-retention', 'privacy-sharing'] },
];

const cleanBody = (md) => md.replace(/^#+\s.*$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
const clip = (text, max = 1100) => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = Math.max(cut.lastIndexOf('\n'), cut.lastIndexOf('. '));
  return `${cut.slice(0, end > max * 0.5 ? end + 1 : max).trim()} …`;
};

let kbCache = null;
/** Support answers plus every policy section, read from the live CMS text so the chat never disagrees with the policy pages. */
const loadKb = async () => {
  if (kbCache) return kbCache;
  const entries = [...FAQ_ENTRIES, ...INFO.map((e) => ({ ...e, source: 'info' }))];
  try {
    const res = await cmsAPI.getLandingPage();
    const legal = res.data?.legal_terms || {};
    const docs = { refund: REFUND_POLICY_TEXT, terms: legal.terms_text, privacy: legal.privacy_text };
    Object.entries(docs).forEach(([source, raw]) => {
      if (!raw) return;
      const text = String(raw).replace(/\r\n/g, '\n');
      const parts = source === 'privacy'
        ? text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p && !/^#/.test(p) && !/^last updated/i.test(p)).map((p) => ({ title: p, body: p }))
        : text.split(/\n(?=### )/).filter((p) => /^### /.test(p)).map((p) => ({ title: p.split('\n')[0].replace(/^###\s*\d*\.?\s*/, ''), body: cleanBody(p) }));
      parts.forEach((part) => {
        const rule = ENTRY_RULES.find((r) => r.source === source && r.test.test(source === 'privacy' ? part.body : part.title) && !entries.some((e) => e.id === r.id));
        if (rule) entries.push({ id: rule.id, source, label: rule.label, words: rule.words, text: part.body });
      });
      const rules = ENTRY_RULES.filter((r) => r.source === source);
      const titles = source === 'privacy' ? [] : parts.map((p) => p.title);
      OVERVIEWS.filter((o) => o.source === source).forEach((o) => {
        const intro = source === 'privacy'
          ? parts[0]?.body
          : `${o.label} covers:\n\n${titles.map((t) => `* ${t}`).join('\n')}\n\nTap a topic below or ask your own question.`;
        entries.push({ id: o.id, source, label: o.label, words: o.words, text: intro || o.label, overview: o.pick, rules });
      });
    });
  } catch (e) {
    /* policies unavailable: the help topics still work */
  }
  Object.entries(FLOWS).forEach(([key, flow]) => {
    if (key === 'main') return;
    const first = String(flow.message || '').split('\n').find((line) => line.trim()) || key;
    entries.push({ id: `flow-${key}`, source: 'flow', flowKey: key, label: first.replace(/[#*]/g, '').trim(), words: [], text: flow.message, link: null });
  });
  kbCache = entries;
  return kbCache;
};

const bestEntry = (tokens, text, kb) => {
  let best = null;
  kb.forEach((entry) => {
    const score = hits(tokens, text, entry.words);
    if (score > 0 && (!best || score > best.score || (score === best.score && !entry.overview && best.entry.overview))) best = { entry, score };
  });
  return best;
};

const STOP_WORDS = new Set(['the', 'and', 'for', 'are', 'you', 'your', 'with', 'what', 'how', 'can', 'does', 'have', 'has', 'this', 'that', 'from', 'will', 'about', 'tell', 'please', 'any', 'there', 'their', 'who', 'why', 'when', 'where', 'which', 'is', 'it', 'in', 'on', 'of', 'to', 'a', 'an', 'my', 'me', 'do', 'be', 'or', 'we', 'i', 'x', 'space', 'xspace', 'xspace360', 'platform', 'site', 'website']);
/** Last resort: find the passage that shares the most meaningful words with the question. */
const retrieve = (tokens, kb) => {
  const wanted = [...new Set(tokens.filter((t) => t.length >= 3 && !STOP_WORDS.has(t)))];
  if (!wanted.length) return null;
  let best = null;
  kb.forEach((entry) => {
    const hay = ` ${normalize(`${entry.label} ${entry.text}`)} `;
    const score = wanted.reduce((n, t) => n + (hay.includes(` ${t} `) || (t.length >= 5 && hay.includes(` ${t}`)) ? (t.length >= 7 ? 2 : 1) : 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { entry, score };
  });
  return best && best.score >= 2 ? best.entry : null;
};

const entryReply = (entry, kb) => {
  const link = entry.link === null ? null : (entry.link || DOC_LINKS[entry.source]);
  const related = entry.overview
    ? entry.overview.map((id) => kb.find((e) => e.id === id)).filter(Boolean)
    : kb.filter((e) => e.source === entry.source && !e.overview && e.id !== entry.id).slice(0, 3);
  return {
    text: entry.overview ? entry.text : `**${entry.label}**\n\n${clip(entry.text)}`,
    links: link ? [link] : [],
    followUps: related.map((e) => ({ label: e.label, ask: `legal:${e.id}` })),
  };
};

const FALLBACK = (suggestion) => ({
  text: suggestion
    ? `I'm not completely sure what you meant. Did you mean **${suggestion.label}**? You can also pick a topic below or type it differently.`
    : "I couldn't find an exact answer for that, but I can help you find a space, explain bookings and refunds, or guide you as a host. Pick a topic or ask in your own words.",
  followUps: [
    ...(suggestion ? [{ label: suggestion.label, next: suggestion.key }] : []),
    ...FLOWS.main.options.map((o) => ({ label: o.label, next: o.next })),
  ].slice(0, 5),
});

const TOPIC_LABELS = {
  guest_refunds: 'Refunds and cancellations', guest_booking: 'How to book', host_listing: 'Listing my property', host_payouts: 'Host payouts',
  support: 'Contact support', host_subscriptions: 'Host subscription plans', guest_workspace_discounts: 'Discounts and offers', how_it_works: 'How X-Space360 works',
};

const describeProperty = (p) => {
  const amenities = (Array.isArray(p.amenities) ? p.amenities : []).slice(0, 6).map((a) => String(typeof a === 'string' ? a : a?.name || '').replace(/_/g, ' ')).filter(Boolean);
  const lines = [
    `**${p.title}**${p.city ? ` in ${p.city}` : ''}`,
    `* Price: **${rupees(priceOf(p))}** per night`,
    p.max_guests ? `* Sleeps up to **${p.max_guests}** guests` : null,
    p.bhk_type ? `* Configuration: ${String(p.bhk_type).toUpperCase()}` : null,
    p.property_type ? `* Type: ${String(p.property_type).replace(/_/g, ' ')}` : null,
    Number(p.rating) > 0 ? `* Rated **${Number(p.rating).toFixed(1)}** out of 5` : null,
    p.instant_booking ? '* Instant booking available' : null,
    amenities.length ? `* Amenities: ${amenities.join(', ')}` : null,
  ].filter(Boolean);
  return lines.join('\n');
};

/** Reads everything searchable out of a sentence (place, type, budget, guests, sorting, amenities, dates). */
const readSearch = (question, text, tokens, catalog) => {
  const found = {};
  const place = findCity(text, tokens, catalog.cities);
  if (place) { found.city = place.city; found.cityCorrected = place.corrected; }
  const typeMatch = TYPE_WORDS.find((t) => hitsStrict(tokens, text, t.words) > 0);
  if (typeMatch) found.type = typeMatch;
  const budget = budgetFrom(question);
  if (budget) found.budget = budget;
  const guestMatch = text.match(/(\d+)\s*(?:guests?|people|persons?|pax|adults?|members?|log|jana|jan|friends|travell?ers)/) || text.match(/(?:for|group of|family of|party of)\s*(\d+)/);
  if (guestMatch) found.guests = Number(guestMatch[1]);
  else if (/\b(couple|honeymoon|two of us)\b/.test(text)) found.guests = 2;
  if (hits(tokens, text, CHEAP_WORDS) > 0) found.sort = 'price_asc';
  else if (hits(tokens, text, LUXURY_WORDS) > 0) found.sort = 'price_desc';
  else if (hits(tokens, text, NEW_WORDS) > 0 && /\b(newest|latest|recent|newly)\b/.test(text)) found.sort = 'newest';
  else if (hits(tokens, text, BEST_WORDS) > 0) found.sort = 'rating';
  const amenities = AMENITY_WORDS.filter((a) => hitsStrict(tokens, text, a.words) > 0).map((a) => a.slug);
  if (amenities.length) found.amenities = amenities;
  if (/\bpet\b|\bpets\b|\bdog\b|\bdogs\b/.test(text)) found.pet = true;
  if (/\binstant\b/.test(text)) found.instant = true;
  if (/\bpool\b|swimming/.test(text)) found.pool = true;
  if (/weekend/.test(text)) found.dates = nextWeekend();
  else if (/\b(tomorrow|tonight|today)\b/.test(text)) {
    const d = new Date();
    if (/tomorrow/.test(text)) d.setDate(d.getDate() + 1);
    const out = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    found.dates = { check_in: iso(d), check_out: iso(out), label: /tomorrow/.test(text) ? 'tomorrow' : 'tonight' };
  }
  return found;
};

const runSearch = async (spec, seen) => {
  const params = { limit: 40, sort: spec.sort === 'rating' || !spec.sort ? 'recommended' : spec.sort };
  if (spec.city) params.city = spec.city;
  if (spec.type) Object.assign(params, spec.type.params);
  if (spec.budget) params.max_price = spec.budget;
  if (spec.guests) params.guests = spec.guests;
  if (spec.amenities?.length) params.amenities = spec.amenities.join(',');
  if (spec.pet) params.pet_friendly = true;
  if (spec.instant) params.instant_booking = true;
  if (spec.pool) params.search = 'pool';
  if (spec.dates) { params.check_in = spec.dates.check_in; params.check_out = spec.dates.check_out; }
  let list = [];
  let total = 0;
  try {
    const res = await propertyAPI.searchProperties(params);
    list = Array.isArray(res.data) ? res.data : res.data?.properties || [];
    total = Array.isArray(res.data) ? list.length : res.data?.total || list.length;
  } catch (e) {
    list = [];
  }
  if (spec.sort === 'rating') list = [...list].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
  const fresh = list.filter((p) => !seen.includes(p.property_id || p.id));
  return { list, fresh, total: total || list.length };
};

const describeSearch = (spec) => {
  const label = spec.type?.label || 'spaces';
  const bits = [];
  if (spec.city) bits.push(`in ${spec.city}`);
  if (spec.budget) bits.push(`under ${rupees(spec.budget)} per night`);
  if (spec.guests) bits.push(`for ${spec.guests} guests`);
  if (spec.dates) bits.push(`for ${spec.dates.label}`);
  if (spec.pool) bits.push('with a pool');
  if (spec.amenities?.length) bits.push(`with ${spec.amenities.map((a) => a.replace(/_/g, ' ')).join(' and ')}`);
  if (spec.pet) bits.push('that are pet friendly');
  if (spec.instant) bits.push('with instant booking');
  const lead = spec.sort === 'price_asc' ? 'cheapest ' : spec.sort === 'price_desc' ? 'premium ' : spec.sort === 'rating' ? 'best rated ' : spec.sort === 'newest' ? 'newest ' : '';
  return { label: `${lead}${label}`, tail: bits.length ? ` ${bits.join(' ')}` : '' };
};

/**
 * Answers a message. `memory` carries the last search so follow-ups ("cheaper", "in Pune", "for 8 guests",
 * "show more") refine it instead of starting over.
 */
const answerFor = async (question, memory) => {
  const text = normalize(question);
  const tokens = tokensOf(text);
  const catalog = await loadCatalog();
  const kb = await loadKb();
  if (question.startsWith('legal:')) {
    const entry = kb.find((e) => e.id === question.slice(6));
    if (entry) return entryReply(entry, kb);
  }

  if (/^(hi+|hello+|hey+|hii+|namaste|namaskar|good (morning|evening|afternoon)|yo|sup)\b/.test(text.trim()) && tokens.length <= 4) {
    return {
      text: 'Hello!  I can help you find a stay, workspace or venue, explain bookings and refunds, or guide you as a host. Try: *"villa near Nashik under 25000 for 6 guests"*.',
      followUps: [{ label: 'Find a villa for a weekend', ask: 'Show villas this weekend' }, { label: 'How booking works', next: 'how_it_works_guest' }, { label: 'List my property', next: 'host_listing' }],
    };
  }
  if (/^(thanks|thank you|thankyou|thx|ok thanks|great|perfect|nice|awesome|dhanyavad|shukriya|bye)\b/.test(text.trim()) && tokens.length <= 4) {
    return { text: "You're welcome! Anything else I can help you with?", followUps: [{ label: 'Talk to support', next: 'support' }, { label: 'Find a space', ask: 'Show popular spaces' }] };
  }

  // a question about one particular property ("price of Vineyard Breeze", "tell me about taj valley")
  const named = findProperty(tokens, text, catalog.list);
  if (named) {
    memory.seen.push(named.property_id || named.id);
    return {
      text: describeProperty(named),
      projects: [named],
      followUps: [{ label: 'Show similar spaces', ask: `Show ${named.property_type || 'villas'} in ${named.city || ''}` }, { label: 'How do I book?', next: 'how_it_works_guest' }],
    };
  }

  // how many / which cities
  if (/\b(how many|total|count|kitne|kiti)\b/.test(text) && /(propert|space|stay|villa|listing|city|cities)/.test(text)) {
    const typeCount = catalog.list.reduce((m, p) => { const k = String(p.property_type || '').replace(/_/g, ' '); if (k) m[k] = (m[k] || 0) + 1; return m; }, {});
    const top = Object.entries(typeCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `* ${titleCase(k)}: ${v}`);
    return {
      text: `We currently have **${catalog.total} live spaces** across **${catalog.cities.length} cities** (${catalog.cities.slice(0, 6).join(', ')}${catalog.cities.length > 6 ? ' and more' : ''}).\n\n${top.join('\n')}`,
      followUps: [{ label: 'Show popular spaces', ask: 'Show popular spaces' }],
    };
  }

  // knowledge topic
  let best = null;
  TOPICS.forEach((topic) => {
    const score = hits(tokens, text, topic.words);
    if (score > 0 && (!best || score >= best.score)) best = { key: topic.key, score };
  });

  // property search signals
  const spec = readSearch(question, text, tokens, catalog);
  const verbs = hits(tokens, text, SEARCH_VERBS);
  const refine = Boolean(memory.search) && (hits(tokens, text, MORE_WORDS) > 0 || Object.keys(spec).length > 0);
  const signal = (spec.type ? 2 : 0) + (spec.budget ? 2 : 0) + (spec.city ? 2 : 0) + (spec.guests ? 1 : 0) + (spec.sort ? 1 : 0) + (spec.amenities || spec.pool || spec.pet || spec.instant || spec.dates ? 1 : 0) + Math.min(verbs, 2);

  const policy = bestEntry(tokens, text, kb);
  if (!refine && policy && policy.score >= (best ? best.score : 0) && (policy.score >= 2 || signal < 2)) return entryReply(policy.entry, kb);
  if (best && !refine && (best.score >= 2 || signal < 2)) return flowReply(best.key);

  if (signal >= 1 || refine) {
    const wantsMore = hits(tokens, text, MORE_WORDS) > 0 && !spec.type && !spec.city && !spec.budget;
    const { cityCorrected, ...cleanSpec } = spec;
    const merged = refine && !cleanSpec.type ? { ...memory.search, ...cleanSpec } : cleanSpec;
    // "cheaper" keeps the place and type but changes the order; a new place or type starts a fresh list
    const restart = Boolean(spec.city || spec.type || spec.budget || spec.sort || spec.guests) && !wantsMore;
    const seen = wantsMore ? memory.seen : restart ? [] : memory.seen;
    const { fresh, list, total } = await runSearch(merged, seen);
    memory.search = merged;
    const { label, tail } = describeSearch(merged);
    const browse = new URLSearchParams();
    if (merged.city) browse.set('search', merged.city);
    if (merged.type?.params.property_type) browse.set('property_type', merged.type.params.property_type);
    if (merged.type?.params.category) browse.set('category', merged.type.params.category);
    if (merged.budget) browse.set('max_price', String(merged.budget));
    const browseUrl = `/guest/browse${browse.toString() ? `?${browse.toString()}` : ''}`;
    const note = cityCorrected ? ` (I read that as ${merged.city})` : '';

    if (!list.length) {
      memory.seen = [];
      return {
        text: `I couldn't find ${label}${tail} right now${note}. Try a nearby city, a higher budget or fewer filters, or browse everything we have.`,
        links: [{ label: 'Browse all spaces', href: '/guest/browse' }],
        followUps: [{ label: 'Show popular spaces', ask: 'Show popular spaces' }, ...(merged.budget ? [{ label: 'Remove the budget', ask: `Show ${label}${merged.city ? ` in ${merged.city}` : ''}` }] : []), { label: 'Talk to support', next: 'support' }].slice(0, 3),
      };
    }
    if (!fresh.length) {
      memory.seen = [];
      return {
        text: `That's all the ${label}${tail} I have. Want to widen the search?`,
        links: [{ label: 'Browse all spaces', href: browseUrl }],
        followUps: [{ label: 'Show popular spaces', ask: 'Show popular spaces' }, { label: 'Talk to support', next: 'support' }],
      };
    }
    const shown = fresh.slice(0, 6);
    memory.seen = [...seen, ...shown.map((p) => p.property_id || p.id)];
    const remaining = fresh.length - shown.length;
    return {
      text: `${wantsMore ? 'Here are some more' : `Here ${shown.length === 1 ? 'is' : 'are'} ${shown.length} of ${total} ${label}`}${tail}${note}:`,
      projects: shown,
      links: [{ label: `See all ${total} on Discover`, href: browseUrl }],
      followUps: [
        ...(remaining > 0 ? [{ label: 'Show more', ask: 'show more' }] : []),
        ...(merged.sort !== 'price_asc' ? [{ label: 'Cheaper options', ask: 'cheaper ones' }] : []),
        ...(!merged.guests ? [{ label: 'For 6 guests', ask: 'for 6 guests' }] : []),
        { label: 'How do I book?', next: 'how_it_works_guest' },
      ].slice(0, 4),
    };
  }

  // nothing matched: guess the closest help topic, if any is nearly right
  let guess = null;
  Object.keys(TOPIC_LABELS).forEach((key) => {
    const topic = TOPICS.find((t) => t.key === key);
    const near = topic ? topic.words.filter((w) => !w.includes(' ') && w.length >= 5).some((w) => tokens.some((t) => t.length >= 4 && distance(t, w) <= 2)) : false;
    if (near && !guess) guess = { key, label: TOPIC_LABELS[key] };
  });
  const passage = retrieve(tokens, kb);
  if (passage) {
    return passage.flowKey ? flowReply(passage.flowKey) : entryReply(passage, kb);
  }
  return FALLBACK(guess);
};

const STARTERS = [
  { text: 'Find a villa for a weekend', hint: 'Suggestions with photo and price', ask: 'Show villas' },
  { text: 'Show co-working spaces', hint: 'Desks, cabins and meeting rooms', ask: 'Show coworking spaces' },
  { text: 'How does booking work?', hint: 'Search, request and payment steps', next: 'how_it_works_guest' },
  { text: 'Cancellation and refund policy', hint: 'Percentages, timelines and how to cancel', ask: 'refund policy' },
  { text: 'I want to list my property', hint: 'Host steps, KYC and payouts', next: 'host_listing' },
  { text: 'Host rules and responsibilities', hint: 'What hosts must follow', ask: 'host responsibilities' },
  { text: 'Guest rules and responsibilities', hint: 'House rules, ID and damage', ask: 'guest responsibilities' },
  { text: 'Terms and conditions', hint: 'Platform terms in simple points', ask: 'terms and conditions' },
  { text: 'Privacy and my data', hint: 'What we collect and how to delete it', ask: 'privacy policy' },
];
const QUICK = [
  { text: 'Find a stay', ask: 'Show popular spaces' },
  { text: 'Booking', next: 'guest_booking' },
  { text: 'Refunds', ask: 'refund policy' },
  { text: 'Hosting', next: 'host_main' },
  { text: 'Host rules', ask: 'host responsibilities' },
  { text: 'Guest rules', ask: 'guest responsibilities' },
  { text: 'Terms', ask: 'terms and conditions' },
  { text: 'Privacy', ask: 'privacy policy' },
  { text: 'Support', next: 'support' },
];

/* ---------------------------------------- UI ---------------------------------------- */

const ProjectCard = ({ property }) => (
  <Link
    to={getPropertyUrl(property)}
    className="group block w-[196px] shrink-0 snap-start overflow-hidden rounded-2xl border border-[#E1E5EA] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-[#9B72CB] hover:shadow-md"
  >
    <div className="h-[104px] w-full overflow-hidden bg-gray-100">
      <img
        src={getImageUrl(typeof property.images?.[0] === 'string' ? property.images[0] : property.images?.[0]?.url) || PROPERTY_IMAGE_PLACEHOLDER}
        alt={property.title}
        loading="lazy"
        onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = PROPERTY_IMAGE_PLACEHOLDER; }}
        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
      />
    </div>
    <div className="p-3">
      <p className="truncate text-[13px] font-semibold text-[#1E2430]">{property.title}</p>
      <p className="mt-0.5 flex items-center gap-1 truncate text-[11.5px] text-[#5F6368]"><MapPin className="h-3 w-3 shrink-0" />{property.city || 'Maharashtra'}</p>
      <div className="mt-1.5 flex items-center justify-between text-[12px]">
        <span className="font-semibold text-[#1E2430]">{rupees(priceOf(property))}<span className="font-normal text-[#5F6368]"> /night</span></span>
        {Number(property.rating) > 0 && <span className="flex items-center gap-0.5 text-[#1E2430]"><Star className="h-3 w-3 fill-[#eab308] text-[#eab308]" />{Number(property.rating).toFixed(1)}</span>}
      </div>
    </div>
  </Link>
);

/** The quick-question chips: scroll with the arrows (or swipe). */
const ChipRow = ({ items, disabled, onPick }) => {
  const rail = useRef(null);
  const [edge, setEdge] = useState({ left: false, right: true });
  const measure = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  useEffect(() => { measure(); }, [measure, items.length]);
  const go = (dir) => rail.current?.scrollBy({ left: dir * 180, behavior: 'smooth' });
  const arrow = 'absolute top-1/2 z-10 grid h-7 w-7 -translate-y-1/2 !transform-none place-items-center rounded-full bg-white text-[#1E2430] shadow-md ring-1 ring-black/5 transition hover:bg-[#F6F0FD]';
  return (
    <div className="relative mb-2">
      <div ref={rail} onScroll={measure} className="no-scrollbar flex gap-2 overflow-x-auto scroll-smooth">
        {items.map((q) => (
          <button key={q.text} type="button" disabled={disabled} onClick={() => onPick(q)} className="shrink-0 rounded-full border border-[#D3DAEA] bg-white px-3 py-1 text-[12.5px] text-[#1E2430] transition hover:border-[#9B72CB] hover:bg-[#F6F0FD] disabled:opacity-50">{q.text}</button>
        ))}
      </div>
      {edge.left && <button type="button" onClick={() => go(-1)} aria-label="Scroll options left" className={`${arrow} left-0`}><ChevronLeft className="h-4 w-4" /></button>}
      {edge.right && <button type="button" onClick={() => go(1)} aria-label="Scroll options right" className={`${arrow} right-0`}><ChevronRight className="h-4 w-4" /></button>}
    </div>
  );
};

/** Property cards in a slider: swipe, use the arrows, or follow the dots. */
const CardSlider = ({ children, count }) => {
  const rail = useRef(null);
  const [state, setState] = useState({ left: false, right: count > 1, index: 0 });
  const measure = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    const step = 208;
    setState({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
      index: Math.min(count - 1, Math.round(el.scrollLeft / step)),
    });
  }, [count]);
  useEffect(() => { measure(); }, [measure, count]);
  const go = (dir) => rail.current?.scrollBy({ left: dir * 208, behavior: 'smooth' });
  const arrow = 'absolute top-[52px] z-10 grid h-8 w-8 !transform-none place-items-center rounded-full bg-white text-[#1E2430] shadow-md ring-1 ring-black/5 transition hover:bg-[#F6F0FD]';
  return (
    <div className="relative mt-2">
      <div ref={rail} onScroll={measure} className="no-scrollbar -mr-2 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 pr-2">
        {children}
      </div>
      {state.left && <button type="button" onClick={() => go(-1)} aria-label="Previous properties" className={`${arrow} left-1`}><ChevronLeft className="h-4 w-4" /></button>}
      {state.right && <button type="button" onClick={() => go(1)} aria-label="Next properties" className={`${arrow} right-1`}><ChevronRight className="h-4 w-4" /></button>}
      {count > 1 && (
        <div className="mt-1.5 flex justify-center gap-1.5" aria-hidden="true">
          {Array.from({ length: Math.min(count, 6) }).map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === state.index ? 'w-4 bg-[#9B72CB]' : 'w-1.5 bg-[#D3DAEA]'}`} />
          ))}
        </div>
      )}
    </div>
  );
};

const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;
/** The assistant never shows emoji; the sparkle icon is the only decoration. */
const stripEmoji = (value) => String(value || '').replace(EMOJI_RE, '').replace(/[ \t]+\n/g, '\n').replace(/\*\* +/g, '** ').replace(/  +/g, ' ').replace(/^ +/gm, '');

const THINK_STEPS = ['Understanding your question', 'Checking help topics and live listings', 'Putting the answer together'];
/** "Thinking" state: shimmering step text and placeholder lines, like a proper assistant. */
const ThinkingBubble = () => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setStep((n) => Math.min(THINK_STEPS.length - 1, n + 1)), 750);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="flex items-start gap-2.5" role="status" aria-live="polite">
      <AiSparkle className="mt-0.5 h-6 w-6 shrink-0 animate-[spin_2.4s_linear_infinite]" />
      <div className="min-w-0 flex-1">
        <p className="ai-shimmer text-[13.5px] font-medium">{THINK_STEPS[step]}…</p>
        <div className="mt-2.5 space-y-2">
          {['92%', '78%', '54%'].map((w) => (
            <div key={w} className="h-2.5 animate-pulse rounded-full bg-gradient-to-r from-[#E8EEFB] via-[#F1E9FB] to-[#E8EEFB]" style={{ width: w }} />
          ))}
        </div>
      </div>
    </div>
  );
};

/** Send button with the gradient ring; it spins while thinking and turns into Stop while the answer types out. */
const AskButton = ({ busy, typing, disabled, hasText, onStop }) => {
  // like Gemini: once something is typed the sparkle becomes a solid "send" arrow
  if (hasText && !typing && !busy) {
    return (
      <button
        type="submit"
        aria-label="Send"
        title="Send"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1E2430] text-white !transform-none transition hover:bg-black"
      >
        <ArrowUp className="h-5 w-5" strokeWidth={2.4} />
      </button>
    );
  }
  return (
    <button
      type={typing ? 'button' : 'submit'}
      onClick={typing ? onStop : undefined}
      disabled={!typing && disabled}
      aria-label={typing ? 'Stop answer' : 'Send'}
      title={typing ? 'Stop' : 'Send'}
      className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full !transform-none transition disabled:opacity-60"
    >
      <span aria-hidden="true" className={`absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#4285F4,#9B72CB,#D96570,#F4B400,#4285F4)] ${busy ? 'animate-[spin_1.4s_linear_infinite]' : ''}`} />
      <span aria-hidden="true" className="absolute inset-[2.5px] rounded-full bg-white" />
      {typing ? <span className="relative h-3.5 w-3.5 rounded-[3px] bg-[#1E2430]" /> : <AiSparkle className="relative h-6 w-6" />}
    </button>
  );
};

const PLACEHOLDERS = ['villas near Nashik under ₹25,000', 'the refund policy', 'how to list my property', 'co-working spaces in Pune', 'host and guest rules', 'a weekend stay for 6 guests'];
/** Types example questions into the empty input, then deletes them, so people see what they can ask. */
const useTypedPlaceholder = (active) => {
  const [typed, setTyped] = useState('');
  useEffect(() => {
    if (!active) { setTyped(''); return undefined; }
    let index = 0;
    let count = 0;
    let deleting = false;
    let id;
    const tick = () => {
      const target = PLACEHOLDERS[index];
      if (!deleting) {
        count += 1;
        setTyped(target.slice(0, count));
        if (count >= target.length) { deleting = true; id = window.setTimeout(tick, 1500); return; }
        id = window.setTimeout(tick, 55);
      } else {
        count -= 1;
        setTyped(target.slice(0, count));
        if (count <= 0) { deleting = false; index = (index + 1) % PLACEHOLDERS.length; id = window.setTimeout(tick, 350); return; }
        id = window.setTimeout(tick, 26);
      }
    };
    id = window.setTimeout(tick, 400);
    return () => window.clearTimeout(id);
  }, [active]);
  return typed;
};

/** Types the answer out like Gemini: the text first, then the cards, then the buttons. */
const AiBody = ({ message, onTick, onDone, onFollow, onClose, stop }) => {
  const { projects = [], links = [], followUps = [], animate } = message;
  const text = stripEmoji(message.text);
  const [chars, setChars] = useState(animate ? 0 : text.length);
  const [cards, setCards] = useState(animate ? 0 : projects.length);
  const textDone = chars >= text.length;
  const allCards = cards >= projects.length;

  useEffect(() => {
    if (!animate || textDone) return undefined;
    const id = window.setTimeout(() => { setChars((c) => Math.min(text.length, c + Math.max(3, Math.ceil(text.length / 120)))); onTick(); }, 14);
    return () => window.clearTimeout(id);
  }, [animate, textDone, chars, text.length, onTick]);

  // the stop button jumps straight to the full answer
  useEffect(() => {
    if (!stop) return;
    setChars(text.length);
    setCards(projects.length);
  }, [stop, text.length, projects.length]);

  useEffect(() => {
    if (!animate || !textDone || allCards) return undefined;
    const id = window.setTimeout(() => { setCards((c) => c + 1); onTick(); }, 220);
    return () => window.clearTimeout(id);
  }, [animate, textDone, allCards, cards, onTick]);

  const finished = textDone && allCards;
  useEffect(() => { if (animate && finished) onDone(); }, [animate, finished, onDone]);

  return (
    <>
      <div className="prose prose-sm max-w-none text-[14.5px] leading-relaxed text-[#1E2430] prose-p:my-1.5 prose-headings:my-1.5 prose-headings:text-[16px] prose-headings:font-semibold prose-a:text-[#4285F4] prose-strong:text-current prose-li:my-0.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5">
        <ReactMarkdown>{text.slice(0, chars)}</ReactMarkdown>
      </div>
      {projects.length > 0 && (
        <CardSlider count={cards}>
          {projects.slice(0, cards).map((p) => <ProjectCard key={p.property_id || p.id} property={p} />)}
        </CardSlider>
      )}
      {finished && links.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {links.map((l) => (l.href.startsWith('/')
            ? <Link key={l.label} to={l.href} onClick={onClose} className="inline-flex items-center rounded-full border border-[#D3DAEA] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#1E2430] transition hover:bg-[#F4F7FE]">{l.label}</Link>
            : <a key={l.label} href={l.href} className="inline-flex items-center gap-1.5 rounded-full border border-[#D3DAEA] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#1E2430] transition hover:bg-[#F4F7FE]"><Phone className="h-3.5 w-3.5" />{l.label}</a>))}
        </div>
      )}
      {finished && followUps.length > 0 && onFollow && (
        <div className="mt-3 flex flex-wrap gap-2">
          {followUps.map((f) => (
            <button key={f.label} type="button" onClick={() => onFollow(f)} className="rounded-full border border-[#D3DAEA] bg-white px-3.5 py-1.5 text-left text-[13px] text-[#1E2430] transition hover:border-[#9B72CB] hover:bg-[#F6F0FD]">{f.label}</button>
          ))}
        </div>
      )}
    </>
  );
};

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [thinking, setThinking] = useState(false);
  const [stopTyping, setStopTyping] = useState(false);
  const [focused, setFocused] = useState(false);
  const [typingDone, setTypingDone] = useState(true);
  const endRef = useRef(null);
  const containerRef = useRef(null);
  const toggleBtnRef = useRef(null);
  const timer = useRef(null);
  const memory = useRef({ search: null, seen: [] });
  const started = messages.length > 0;
  const typedHint = useTypedPlaceholder(isOpen && !text && !focused);
  const lastAiIndex = (() => { for (let i = messages.length - 1; i >= 0; i -= 1) if (messages[i].from === 'ai') return i; return -1; })();

  const scrollDown = useCallback(() => endRef.current?.scrollIntoView({ block: 'nearest' }), []);
  const onTypingDone = useCallback(() => setTypingDone(true), []);
  const closeChat = useCallback(() => { setIsOpen(false); toggleBtnRef.current?.focus(); }, []);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  useEffect(() => { if (started) endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [messages, thinking, started]);

  const push = (userText, makeReply) => {
    setMessages((m) => [...m, { from: 'user', text: userText }]);
    setThinking(true);
    setStopTyping(false);
    const startedAt = Date.now();
    timer.current = window.setTimeout(async () => {
      const reply = await makeReply();
      // a longer answer takes a little longer to "think", like a real assistant
      const minThink = 1100 + Math.min(1500, (reply.text || '').length * 1.4);
      const wait = Math.max(0, minThink - (Date.now() - startedAt));
      timer.current = window.setTimeout(() => {
        setTypingDone(false);
        setMessages((m) => [...m, { from: 'ai', ...reply, animate: true }]);
        setThinking(false);
      }, wait);
    }, 150);
  };

  const ask = (raw) => {
    const question = raw.trim();
    if (!question || thinking) return;
    setText('');
    push(question, () => answerFor(question, memory.current));
  };

  const follow = (item) => {
    if (thinking) return;
    if (item.next) push(item.label, async () => flowReply(item.next));
    else if (item.ask) push(item.label, () => answerFor(item.ask, memory.current));
  };

  const reset = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setMessages([]);
    setThinking(false);
    setText('');
    memory.current = { search: null, seen: [] };
  };

  useEffect(() => {
    const handleOpenHowItWorks = () => {
      setIsOpen(true);
      setThinking(false);
      setTypingDone(false);
      setMessages([{ from: 'user', text: 'How does X-Space360 work?' }, { from: 'ai', ...flowReply('how_it_works'), animate: true }]);
    };
    window.addEventListener('open-chatbot-how-it-works', handleOpenHowItWorks);
    return () => window.removeEventListener('open-chatbot-how-it-works', handleOpenHowItWorks);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') closeChat();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeChat]);

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div
          ref={containerRef}
          role="dialog"
          aria-label="X-Space360 Assistant"
          className="relative mb-4 flex h-[620px] max-h-[85vh] w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-[0_24px_70px_-12px_rgba(20,20,20,0.35)] animate-scale-up z-50 focus:outline-none"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_45%_at_50%_100%,rgba(66,133,244,0.16),rgba(155,114,203,0.07)_55%,transparent_80%)]" />

          <div className="relative flex items-center justify-between px-5 pt-4 pb-2">
            <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#1E2430]"><AiSparkle className="h-5 w-5" />{BOT_NAME}</span>
            <div className="flex items-center gap-1">
              {started && (
                <button type="button" onClick={reset} aria-label="New chat" title="New chat" className="grid h-9 w-9 place-items-center rounded-full text-[#5F6368] transition hover:bg-[#F1F3F4]"><RotateCcw className="h-[18px] w-[18px]" /></button>
              )}
              <button type="button" onClick={closeChat} aria-label="Close assistant" className="grid h-9 w-9 place-items-center rounded-full text-[#5F6368] transition hover:bg-[#F1F3F4]"><X className="h-5 w-5" /></button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col px-5 pb-2 pt-2">
            {!started ? (
              <div className="no-scrollbar flex min-h-0 flex-1 flex-col items-center overflow-y-auto pt-2 text-center">
                <AiSparkle className="h-10 w-10" />
                <h3 className="mt-3 text-[22px] font-medium leading-tight text-[#1E2430]">
                  <span className="bg-gradient-to-r from-[#4285F4] via-[#9B72CB] to-[#D96570] bg-clip-text text-transparent">Hello,</span> where should we start?
                </h3>
                <p className="mt-1.5 max-w-[320px] text-[13.5px] text-[#5F6368]">Ask me about stays, workspaces and venues, bookings, refunds or hosting.</p>
                <div className="mt-4 grid w-full gap-2.5">
                  {STARTERS.map((s) => (
                    <button key={s.text} type="button" onClick={() => follow({ label: s.text, next: s.next, ask: s.ask })} className="rounded-2xl border border-[#E1E5EA] bg-white/90 p-3.5 text-left shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-[#9B72CB] hover:bg-[#F6F0FD] hover:shadow-md">
                      <span className="block text-[14px] font-medium text-[#1E2430]">{s.text}</span>
                      <span className="mt-0.5 block text-[12px] text-[#5F6368]">{s.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="no-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto pb-2">
                {messages.map((m, i) => (
                  <div key={i} className={m.from === 'user' ? 'flex justify-end' : 'flex items-start gap-2.5'}>
                    {m.from === 'ai' && <AiSparkle className="mt-1 h-6 w-6 shrink-0" />}
                    <div className={m.from === 'user' ? 'max-w-[85%] rounded-3xl rounded-br-lg bg-[#E8EEFB] px-4 py-2.5 text-[14px] text-[#1E2430]' : 'min-w-0 max-w-[94%]'}>
                      {m.from === 'user'
                        ? <p>{m.text}</p>
                        : <AiBody message={m} onTick={scrollDown} onDone={onTypingDone} onClose={closeChat} onFollow={i === lastAiIndex && !thinking ? follow : null} stop={i === lastAiIndex && stopTyping} />}
                    </div>
                  </div>
                ))}
                {thinking && <ThinkingBubble />}
                <div ref={endRef} />
              </div>
            )}
          </div>

          <div className="relative px-4 pb-3">
            {started && <ChipRow items={QUICK} disabled={thinking} onPick={(q) => follow({ label: q.text, next: q.next, ask: q.ask })} />}
            <form onSubmit={(e) => { e.preventDefault(); ask(text); }} className="flex items-center gap-2 rounded-full border border-[#DCE3EF] bg-white py-1.5 pl-2 pr-1.5 shadow-[0_4px_18px_rgba(66,133,244,0.12)] transition focus-within:border-[#9B72CB] focus-within:shadow-[0_6px_24px_rgba(155,114,203,0.22)]">
              <button type="button" onClick={reset} aria-label="New chat" title="New chat" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#5F6368] transition hover:bg-[#F1F3F4]"><Plus className="h-5 w-5" /></button>
              <div className="relative min-w-0 flex-1">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder={focused ? 'Ask X-Space360 anything' : ''}
                  aria-label="Ask X-Space360 anything"
                  className="h-9 w-full min-w-0 !border-0 !bg-transparent !shadow-none !ring-0 text-[15px] text-[#1E2430] !outline-none focus:!border-0 focus:!shadow-none focus:!ring-0 focus:!outline-none placeholder:text-[#80868B]"
                />
                {!text && !focused && (
                  <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center overflow-hidden whitespace-nowrap text-[15px] text-[#80868B]">
                    Ask about {typedHint}<span className="ml-0.5 h-[18px] w-px animate-pulse bg-[#9B72CB]" />
                  </span>
                )}
              </div>
              <AskButton busy={thinking} typing={!thinking && !typingDone} disabled={!text.trim() || thinking} hasText={Boolean(text.trim())} onStop={() => setStopTyping(true)} />
            </form>
            <p className="mt-1.5 text-center text-[11px] text-[#80868B]">Answers come from X-Space360 help topics and live listings. Confirm important details with support.</p>
          </div>
        </div>
      )}

      {!isOpen && (
        <div className="flex flex-col items-center space-y-3.5">
          <a
            href="https://api.whatsapp.com/send?phone=919225586010&text=Hi%2C%20I%27m%20interested%20in%20booking%20a%20stay.%20Please%20share%20details."
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            title="Chat on WhatsApp"
            className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-[#22c55e] hover:bg-[#16a34a] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7 sm:h-8 sm:w-8 fill-current text-white">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
          </a>

          <button
            ref={toggleBtnRef}
            id="chatbot-toggle-btn"
            onClick={() => setIsOpen(true)}
            aria-label="Open X-Space360 assistant"
            title="Ask X-Space360"
            className="grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-full border border-[#E1E5EA] bg-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#9B72CB]"
          >
            <AiSparkle className="h-7 w-7 sm:h-8 sm:w-8" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;
