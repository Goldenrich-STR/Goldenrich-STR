import React, { useState, useRef, useEffect } from 'react';
import { 
  X, MessageSquare, Sparkles,
  User, Home, Phone, Search, Layers, CreditCard, HelpCircle, FileText, ShieldCheck, DollarSign, Mail, ArrowLeft,
  Calendar, ShieldAlert, BadgeInfo, PencilLine, AlertTriangle, Landmark, Scale, Clock, RefreshCw, Landmark as Bank, LifeBuoy
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Icon mapping for options
const IconMap = {
  user: User,
  home: Home,
  phone: Phone,
  search: Search,
  layers: Layers,
  creditCard: CreditCard,
  help: HelpCircle,
  fileText: FileText,
  shield: ShieldCheck,
  dollar: DollarSign,
  mail: Mail,
  arrowLeft: ArrowLeft,
  calendar: Calendar,
  shieldAlert: ShieldAlert,
  badgeInfo: BadgeInfo,
  pencil: PencilLine,
  alert: AlertTriangle,
  bank: Landmark,
  scale: Scale,
  clock: Clock,
  refresh: RefreshCw,
  ticket: LifeBuoy
};

// Deeply Nested Dialog Flows
const FLOWS = {
  main: {
    message: "### **Welcome to X-Space360 Helpdesk!**\nHow can we assist you today? Please select your query area below to get started:",
    options: [
      { label: "How It Works (Booking & Listing Steps)", next: "how_it_works", icon: "help" },
      { label: "I am a Guest / Customer", next: "guest_main", icon: "user" },
      { label: "I am a Host / Property Owner", next: "host_main", icon: "home" },
      { label: "Grievance & Support Desk", next: "support", icon: "phone" }
    ]
  },
  
  how_it_works: {
    message: "### **How X-Space360 Works** 🚀\nWhether you are looking to book a space or list your property, we make the process simple and transparent!\n\nSelect what you'd like to explore:",
    options: [
      { label: "How to Book a Space (Guest Steps)", next: "how_it_works_guest", icon: "search" },
      { label: "How to List Your Property (Host Steps)", next: "how_it_works_host", icon: "home" },
      { label: "Back to Main Menu", next: "main", icon: "arrowLeft" }
    ]
  },
  how_it_works_guest: {
    message: "### **How to Book a Space (4 Simple Steps)** 🏡\n\n1. 🔍 **Search & Discover**: Select your city, check-in/out dates, and guest count to find verified villas, workspaces, or event venues.\n2. 📄 **Choose & Review**: Explore HD photo galleries, pricing breakdown, rules, and host ratings.\n3. ⚡ **Request or Instant Book**:\n   * **Instant Book (Zap Icon ⚡)**: Pay and get immediate confirmation.\n   * **Request Book**: Send booking request. Host confirms within 24 hrs.\n4. 💳 **Secure Payment**: Pay via Razorpay with 100% buyer protection and instant booking voucher!",
    options: [
      { label: "How to List Your Property (Host Steps)", next: "how_it_works_host", icon: "home" },
      { label: "Back to Main Menu", next: "main", icon: "arrowLeft" }
    ]
  },
  how_it_works_host: {
    message: "### **How to List Your Property (3 Simple Steps)** 🔑\n\n1. 📝 **Register & Verify KYC**: Sign up as a host and upload basic documents (Aadhaar, PAN, Property Proof).\n2. 📸 **List Your Space**: Set your price, upload photos, add amenities, and block personal dates on calendar.\n3. 💰 **Receive Bookings & 100% Payout**: Host guests and get **100% payout with 0% platform commission** within 3 business days of check-out!",
    options: [
      { label: "How to Book a Space (Guest Steps)", next: "how_it_works_guest", icon: "search" },
      { label: "Back to Main Menu", next: "main", icon: "arrowLeft" }
    ]
  },
  
  // ==================== GUEST FLOWS ====================
  guest_main: {
    message: "### **Guest Support Menu**\nExplore topics related to finding, booking, and managing your stays on X-Space360:",
    options: [
      { label: "How to Browse & Book?", next: "guest_booking", icon: "search" },
      { label: "Property Categories & Rules", next: "guest_categories", icon: "layers" },
      { label: "Payments, Cancellations & Refunds", next: "guest_refunds", icon: "creditCard" },
      { label: "Meet our CRM Team (Brokers/RM/BM)", next: "guest_crm_info", icon: "shield" },
      { label: "How to Raise a Support Ticket?", next: "guest_tickets", icon: "ticket" },
      { label: "Back to Main Menu", next: "main", icon: "arrowLeft" }
    ]
  },
  guest_booking: {
    message: "### **How to Book a Space**\nBooking is secure and straightforward:\n\n1. **Search**: Enter the city, dates, and number of guests on the search bar.\n2. **Filter**: Filter by Category (Residential, Commercial, or Event Venue) and property types.\n3. **Request**: Click **Book Now** to submit a booking request. \n4. **Approval**: The host has **24 hours** to approve your request. No charge is made until approved.\n5. **Payment**: Once approved, complete payment securely via Razorpay to confirm.",
    options: [
      { label: "Instant Booking vs Request", next: "guest_booking_instant", icon: "sparkles" },
      { label: "Can I reschedule dates?", next: "guest_booking_reschedule", icon: "calendar" },
      { label: "Back to Guest Menu", next: "guest_main", icon: "arrowLeft" }
    ]
  },
  guest_booking_instant: {
    message: "### **Instant Booking vs Request**\n* **Instant Booking**: Properties with a orange **Zap / Lightning icon** are active for instant booking. You pay immediately, and the booking is confirmed instantly without host approval.\n* **Booking Request**: Standard properties require the host to confirm availability. The request is active for **24 hours**. You are only billed after host approval.",
    options: [
      { label: "Can I reschedule dates?", next: "guest_booking_reschedule", icon: "calendar" },
      { label: "Back to Guest Menu", next: "guest_main", icon: "arrowLeft" }
    ]
  },
  guest_booking_reschedule: {
    message: "### **Rescheduling Policy**\n* **Before Payment**: Simply cancel the booking request and submit a new one with your updated dates.\n* **After Payment**: Date modifications require the host's consent. Please contact your assigned **Relationship Manager (RM)** or support desk. If approved, we will adjust the reservation on the backend.",
    options: [
      { label: "Instant Booking vs Request", next: "guest_booking_instant", icon: "sparkles" },
      { label: "Back to Guest Menu", next: "guest_main", icon: "arrowLeft" }
    ]
  },
  guest_categories: {
    message: "### **Property Categories & Guidelines**\nWe list three premium categories:\n\n1. **Residential Stays**: Villas, Bungalows, Apartments, Studios, Private Houses, and Farmhouses.\n2. **Commercial Spaces**: Private Offices, Co-working Desks, Meeting Rooms, and Conference Rooms.\n3. **Event Venues**: Banquet Halls, Hotel Ballrooms, and Wedding Venues.\n\nChoose below to learn about specific rules:",
    options: [
      { label: "Rules for Events & Shoots", next: "guest_event_rules", icon: "scale" },
      { label: "Long-term Workspace Discounts", next: "guest_workspace_discounts", icon: "dollar" },
      { label: "Back to Guest Menu", next: "guest_main", icon: "arrowLeft" }
    ]
  },
  guest_event_rules: {
    message: "### **Event & Shoot Rules**\n* **Capacity Limit**: Exceeding the maximum capacity of a venue without permission will incur extra guest fees.\n* **Music & Noise**: Loud music, sound systems, and DJs must stop by **10:00 PM** in accordance with local regulations.\n* **Decor/Catering**: External caterers and decorators are allowed only after prior written approval from the host.",
    options: [
      { label: "Long-term Workspace Discounts", next: "guest_workspace_discounts", icon: "dollar" },
      { label: "Back to Guest Menu", next: "guest_main", icon: "arrowLeft" }
    ]
  },
  guest_workspace_discounts: {
    message: "### **Workspace Long-term Discounts**\n* **Weekly Stays**: Save **10-15%** on booking co-working desks or private cabins for 7+ consecutive days.\n* **Monthly Stays**: Save up to **30%** on bookings of 30+ days.\n* **Corporate Rates**: Contact [customer.support@x-space360.com](mailto:customer.support@x-space360.com) for special bulk discounts for teams.",
    options: [
      { label: "Rules for Events & Shoots", next: "guest_event_rules", icon: "scale" },
      { label: "Back to Guest Menu", next: "guest_main", icon: "arrowLeft" }
    ]
  },
  guest_refunds: {
    message: "### **Payments & Refunds**\nAll transactions are processed securely via Razorpay:\n\n* **Premium Service Fee**: A **10% Service Fee** is added at checkout (non-refundable for voluntary cancellations).\n* **Cancellation & Refund Windows**:\n  * **100% Refund**: Cancel up to 48 hours before check-in.\n  * **50% Refund**: Cancel between 24-48 hours before check-in.\n  * **No Refund**: Cancel less than 24 hours prior to check-in.",
    options: [
      { label: "How to claim a refund?", next: "guest_refund_claim", icon: "refresh" },
      { label: "Security Deposit refunds", next: "guest_security_refund", icon: "shieldAlert" },
      { label: "Back to Guest Menu", next: "guest_main", icon: "arrowLeft" }
    ]
  },
  guest_refund_claim: {
    message: "### **How to Claim Your Refund**\n1. Go to **Dashboard** $\\rightarrow$ **My Bookings**.\n2. Locate your booking and click **Cancel Booking**.\n3. The system will calculate your eligible refund percentage based on the cancellation window.\n4. Approved refunds are initiated immediately and take **5-7 business days** to reflect in your bank account.",
    options: [
      { label: "Security Deposit refunds", next: "guest_security_refund", icon: "shieldAlert" },
      { label: "Back to Guest Menu", next: "guest_main", icon: "arrowLeft" }
    ]
  },
  guest_security_refund: {
    message: "### **Security Deposit Refund Policy**\n* **Collection**: Hosts may charge a security deposit for high-value properties to cover potential damage.\n* **Refund Timing**: The deposit is fully refunded by the host within **48 hours of check-out** after property inspection.\n* **Disputes**: In case of damage claims, hosts must submit photos and proof to X-Space360 within 24 hours.",
    options: [
      { label: "How to claim a refund?", next: "guest_refund_claim", icon: "refresh" },
      { label: "Back to Guest Menu", next: "guest_main", icon: "arrowLeft" }
    ]
  },
  guest_crm_info: {
    message: "### **Our CRM Team (Brokers/RM/BM)**\nTo deliver a premium experience, X-Space360 employs a dedicated management team:\n\n* **Broker**: Local partner assigned to inspect properties, assist with site visits, and coordinate listing verify.\n* **Relationship Manager (RM)**: Your dedicated point of contact for issues related to check-in assistance, booking edits, and host disputes.\n* **Branch Manager (BM)**: The regional head supervising all RM and Broker activities, ensuring policy compliance.",
    options: [
      { label: "Back to Guest Menu", next: "guest_main", icon: "arrowLeft" }
    ]
  },
  guest_tickets: {
    message: "### **Raising a Support Ticket**\nIf you face an issue during your stay, you can raise an official support ticket:\n\n1. Login to your account.\n2. Go to **Dashboard** $\\rightarrow$ **Support Tickets**.\n3. Click **Raise Support Ticket**.\n4. Enter a subject, description, and category.\n5. Our system automatically assigns a Relationship Manager (RM) who will contact you within **1 hour**.",
    options: [
      { label: "Back to Guest Menu", next: "guest_main", icon: "arrowLeft" }
    ]
  },

  // ==================== HOST FLOWS ====================
  host_main: {
    message: "### **Host Support Menu**\nWelcome Host Partner! How can we help you manage your properties, bookings, or payouts?",
    options: [
      { label: "Host Onboarding & KYC", next: "host_onboarding", icon: "shield" },
      { label: "Listing a Space & Calendar Blockouts", next: "host_listing", icon: "layers" },
      { label: "Subscription Plans & Free Trial", next: "host_subscriptions", icon: "dollar" },
      { label: "Payouts, Earnings & 0% Commission", next: "host_payouts", icon: "creditCard" },
      { label: "Host Support Team & Managers", next: "host_crm_info", icon: "badgeInfo" },
      { label: "Back to Main Menu", next: "main", icon: "arrowLeft" }
    ]
  },
  host_onboarding: {
    message: "### **Host Onboarding & KYC Verification**\nEvery listing goes live after account verification:\n\n1. Register as a Host on the [Registration Page](/register).\n2. Navigate to **Host Dashboard** $\\rightarrow$ **Verification** tab.\n3. Upload clear copies of: Aadhaar, PAN, Address Proof, and Municipal NOC/Shop Act.\n4. Admin reviews and approves KYC within 24-48 hours.",
    options: [
      { label: "Why is Shop Act mandatory?", next: "host_shop_act", icon: "badgeInfo" },
      { label: "KYC Rejection reasons", next: "host_kyc_rejections", icon: "shieldAlert" },
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },
  host_shop_act: {
    message: "### **Shop Act License Requirement**\n* **Why is it required?**: Under local commercial laws, commercial leasing of event venues or short-term stays requires registration.\n* **Alternatives**: If you do not have a Shop Act, you can upload a **GST registration certificate**, **Property Tax receipt (commercial)**, or **NOC from the local Gram Panchayat/Municipality**.",
    options: [
      { label: "KYC Rejection reasons", next: "host_kyc_rejections", icon: "shieldAlert" },
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },
  host_kyc_rejections: {
    message: "### **Common KYC Rejection Reasons**\n1. **Blurred Images**: Re-upload clear, readable document files.\n2. **Name Mismatch**: The bank account owner name must match the Aadhaar and PAN.\n3. **Address Proof Mismatch**: Utility bill or lease deed must match the listing address.\n4. **Expired Document**: Ensure municipal licenses are current.",
    options: [
      { label: "Why is Shop Act mandatory?", next: "host_shop_act", icon: "badgeInfo" },
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },
  host_listing: {
    message: "### **Listing & Calendar Management**\nManaging your listings is quick and simple:\n\n* **Listing a Space**: Head to dashboard, click **+ List New Property**, set pricing, rules, upload photos, and pinpoint your location on the map.\n* **Calendar Blockouts**: Go to **Calendar** $\\rightarrow$ select dates $\\rightarrow$ click **Block Selected Dates** to prevent guest bookings during maintenance or personal use.\n* **Instant Booking**: Toggle this on to allow guests to book instantly without waiting for your manual approval.",
    options: [
      { label: "How to edit active listings?", next: "host_listing_edit", icon: "pencil" },
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },
  host_listing_edit: {
    message: "### **Editing Active Listings**\n* **Instant Edits**: Go to **My Listings** $\\rightarrow$ click **Edit** to modify descriptions, change base prices, or toggle amenities instantly.\n* **Address changes**: Changing the map coordinates or street address will temporarily return the listing to a pending verification status for admin check.",
    options: [
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },
  host_subscriptions: {
    message: "### **Hosting Fees & Subscription Plans**\n* **Promotional Offer**: Hosting on X-Space360 is **completely FREE until December 2026**! No subscription or registration fees apply.\n* **Post-Promo BHK Plans**: Standard BHK-specific plans (₹999/mo for Studio/1BHK, ₹1,999/mo for 2/3BHK) will commence starting January 2027.",
    options: [
      { label: "Subscription renewals post-promo", next: "host_sub_renewals", icon: "alert" },
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },
  host_sub_renewals: {
    message: "### **Subscription Renewal (Post-Promo)**\n* **Auto-Billing**: Subscriptions will auto-renew monthly via stored Razorpay credentials once active in 2027.\n* **Grace Period**: If renewal fails, you receive a **3-day grace period** to clear dues before listings are hidden.",
    options: [
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },
  host_payouts: {
    message: "### **Payouts & Platform Commission**\n* **0% Host Commission**: X-Space360 does **not deduct any platform fees or commission** from your base rate. You receive **100%** of your listed price!\n* **Schedule**: Payouts are transferred to your verified bank account within **3 business days** after guest check-out.\n* **Government TDS**: 1% TDS is deducted under Section 194O of the IT Act (claimable in your annual ITR).",
    options: [
      { label: "GST & Tax Regulations", next: "host_tax_details", icon: "bank" },
      { label: "Delayed Payout Troubleshooting", next: "host_delayed_payout", icon: "alert" },
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },
  host_tax_details: {
    message: "### **GST & Indian Tax Regulations**\n* **TDS under 194O**: As an e-commerce platform, we deduct **1% TDS** on the gross booking amount and file it against your PAN. You can claim this refund during your annual tax filing.\n* **GST**: Hosts are responsible for filing GST on renting commercial/residential properties if their annual turnover exceeds the threshold.",
    options: [
      { label: "Delayed Payout Troubleshooting", next: "host_delayed_payout", icon: "alert" },
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },
  host_delayed_payout: {
    message: "### **Delayed Payout Troubleshooting**\nIf your payout has not arrived in 3 business days, check the following:\n\n1. **Bank Details**: Ensure your IFSC code and account number are correct on your dashboard.\n2. **Bank Holidays**: Payouts are not processed on Saturdays, Sundays, and national holidays.\n3. **Guest Disputes**: If a guest files a dispute regarding amenities, payouts may be temporarily held until resolved.",
    options: [
      { label: "GST & Tax Regulations", next: "host_tax_details", icon: "bank" },
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },
  host_crm_info: {
    message: "### **Meet Your Management Team**\nTo assist hosts in managing listings, X-Space360 assigns a dedicated team:\n\n* **Local Broker**: Conducts physical verification, photographs the property, and answers local guest queries.\n* **Relationship Manager (RM)**: Helps hosts resolve booking conflicts, payout delays, and guest complaints.\n* **Branch Manager (BM)**: The regional leader supervising both Brokers and RMs, ensuring top-tier service.",
    options: [
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },

  // ==================== SUPPORT FLOW ====================
  support: {
    message: "### **Contact X-Space360 Helpdesk**\nIf you need direct escalation or phone assistance, contact our support team:\n\n* **Helpline**: [+91 8484826247](tel:+918484826247) (9 AM - 7 PM)\n* **Email Support**: [customer.support@x-space360.com](mailto:customer.support@x-space360.com)\n* **Grievance Desk**: Email to [customer.support@x-space360.com](mailto:customer.support@x-space360.com) with booking ID.",
    options: [
      { label: "Main Menu", next: "main", icon: "home" }
    ]
  }
};

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      role: 'model', 
      content: FLOWS.main.message, 
      options: FLOWS.main.options 
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const toggleBtnRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  useEffect(() => {
    const handleOpenHowItWorks = () => {
      setIsOpen(true);
      setMessages([
        {
          role: 'model',
          content: FLOWS.how_it_works.message,
          options: FLOWS.how_it_works.options
        }
      ]);
    };
    window.addEventListener('open-chatbot-how-it-works', handleOpenHowItWorks);
    return () => window.removeEventListener('open-chatbot-how-it-works', handleOpenHowItWorks);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        toggleBtnRef.current?.focus();
        return;
      }

      if (e.key === 'Tab' && chatContainerRef.current) {
        const focusableElements = chatContainerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements.length) return;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleOptionClick = (option) => {
    if (isTyping) return;

    const newMessages = [...messages, { role: 'user', content: option.label }];
    setMessages(newMessages);
    setIsTyping(true);

    setTimeout(() => {
      const nextFlow = FLOWS[option.next];
      if (nextFlow) {
        setMessages([
          ...newMessages, 
          { role: 'model', content: nextFlow.message, options: nextFlow.options }
        ]);
      } else {
        setMessages([
          ...newMessages, 
          { 
            role: 'model', 
            content: "Sorry, that section is under construction. Let's return to the main menu.", 
            options: FLOWS.main.options 
          }
        ]);
      }
      setIsTyping(false);
    }, 600);
  };

  const handleRestart = () => {
    setMessages([
      { 
        role: 'model', 
        content: FLOWS.main.message, 
        options: FLOWS.main.options 
      }
    ]);
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div 
          ref={chatContainerRef}
          role="dialog"
          aria-label="Support Chat Assistant"
          aria-modal="true"
          className="w-[380px] h-[600px] max-h-[85vh] max-w-[calc(100vw-2rem)] bg-white border border-gray-200 shadow-elevated rounded-3xl flex flex-col mb-4 overflow-hidden animate-scale-up z-50 focus:outline-none"
          tabIndex="-1"
        >
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#1E1E1E] text-white shadow-md z-10">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-terracotta to-amber-500 flex items-center justify-center shadow-lg animate-pulse-slow">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-[15px] font-bold tracking-tight leading-tight text-white">X-Space360 Assistant</h3>
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </div>
                </div>
                <p className="text-[10px] font-semibold text-gray-400 mt-0.5 tracking-wider">Typically replies instantly</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setIsOpen(false);
                toggleBtnRef.current?.focus();
              }}
              aria-label="Close support chat assistant"
              className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-gray-400 hover:text-white border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-5 overflow-y-auto bg-gray-50/50 space-y-6 relative flex flex-col no-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
                {msg.role === 'model' && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-terracotta to-amber-500 flex items-center justify-center shrink-0 mr-3 mt-1 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div 
                  className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-[14px] leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-[#1E1E1E] text-white rounded-tr-sm animate-fade-in-left' 
                      : 'bg-[#F9F6F0] text-gray-800 border border-[#EBE5D9]/60 rounded-tl-sm animate-fade-in-right'
                  }`}
                >
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-a:text-terracotta prose-a:no-underline hover:prose-a:underline prose-strong:text-current">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  
                  {msg.options && msg.options.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-150 flex flex-col gap-2">
                      {msg.options.map((opt, i) => {
                        const IconComponent = IconMap[opt.icon] || HelpCircle;
                        return (
                          <button
                            key={i}
                            disabled={isTyping}
                            onClick={() => handleOptionClick(opt)}
                            className="w-full text-left px-4 py-2.5 bg-white hover:bg-terracotta hover:text-white text-charcoal font-bold text-xs rounded-xl border border-[#EAE3D2] transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            <div className="flex items-center space-x-2">
                               <IconComponent className="w-4 h-4 shrink-0 transition-colors duration-200" />
                               <span>{opt.label}</span>
                            </div>
                            <span className="text-gray-400 font-normal transition-colors hover:text-white">→</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-terracotta to-amber-500 flex items-center justify-center shrink-0 mr-3 mt-1 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-[#F9F6F0] border border-[#EBE5D9]/60 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center space-x-1.5">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Navigation Bar */}
          <div className="p-4 bg-white border-t border-gray-100 flex flex-col space-y-3 z-10 shadow-inner">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handleRestart}
                disabled={isTyping}
                className="flex-1 py-2 px-3 bg-gray-100 hover:bg-[#1E1E1E] text-charcoal hover:text-white font-bold text-xs rounded-xl transition duration-200 cursor-pointer disabled:opacity-50 border border-gray-200 flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restart Assistant</span>
              </button>
              <button
                onClick={() => handleOptionClick({ label: "Contact Support Desk", next: "support" })}
                disabled={isTyping}
                className="flex-1 py-2 px-3 bg-terracotta/10 hover:bg-terracotta text-terracotta hover:text-white font-bold text-xs rounded-xl transition duration-200 cursor-pointer disabled:opacity-50 border border-terracotta/20 flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Support</span>
              </button>
            </div>
            <div className="text-center">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Powered by X-Space360 Helpdesk</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Buttons Stack (WhatsApp + Chatbot) */}
      {!isOpen && (
        <div className="flex flex-col items-center space-y-3.5">
          {/* Direct WhatsApp Chat Button */}
          <a
            href="https://api.whatsapp.com/send?phone=919225586010&text=Hi%2C%20I%27m%20interested%20in%20booking%20a%20stay.%20Please%20share%20details."
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            title="Chat on WhatsApp"
            className="w-14 h-14 rounded-full bg-[#22c55e] hover:bg-[#16a34a] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current text-white">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
          </a>

          {/* Chatbot Assistant Toggle Button */}
          <button
            ref={toggleBtnRef}
            id="chatbot-toggle-btn"
            onClick={() => setIsOpen(true)}
            aria-label="Open support chat assistant"
            title="Open Chatbot Assistant"
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-terracotta to-amber-500 text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border-none focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <MessageSquare className="w-6 h-6 text-white" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;
