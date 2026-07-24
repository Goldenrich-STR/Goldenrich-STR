import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Send, MessageSquare, Sparkles,
  User, Home, Phone, Search, Layers, CreditCard, HelpCircle, FileText, ShieldCheck, DollarSign, Mail, ArrowLeft,
  Calendar, ShieldAlert, BadgeInfo, PencilLine, AlertTriangle, Landmark, Scale, Clock, RefreshCw
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
  refresh: RefreshCw
};

// Deeply Nested Dialog Flows
const FLOWS = {
  main: {
    message: "Welcome to X-Space360 Helpdesk! Let us know how we can assist you today. Please select your role:",
    options: [
      { label: "I am a Guest / Customer", next: "guest_main", icon: "user" },
      { label: "I am a Host / Property Owner", next: "host_main", icon: "home" },
      { label: "Contact Support Desk", next: "support", icon: "phone" }
    ]
  },
  
  // ==================== GUEST FLOWS ====================
  guest_main: {
    message: "### **Guest Support Menu**\nHow can we help you with finding, booking, or managing spaces?",
    options: [
      { label: "How to Browse & Book?", next: "guest_booking", icon: "search" },
      { label: "Property Categories & Rules", next: "guest_categories", icon: "layers" },
      { label: "Payment & Refund Policy", next: "guest_refunds", icon: "creditCard" },
      { label: "Back to Main Menu", next: "main", icon: "arrowLeft" }
    ]
  },
  guest_booking: {
    message: "### **How to Book a Space**\nBooking on X-Space360 is simple:\n\n1. Use the **search bar** to choose city, check-in/out dates, and guest count.\n2. Filter by Category (Residential, Commercial, or Event Venue).\n3. Click on a property to see pricing, rules, and amenities.\n4. Click **Book Now** to submit a booking request. \n5. Once approved, pay securely via Razorpay.",
    options: [
      { label: "How does approval work?", next: "guest_booking_approval", icon: "clock" },
      { label: "Can I reschedule dates?", next: "guest_booking_reschedule", icon: "calendar" },
      { label: "Back to Guest Menu", next: "guest_main", icon: "arrowLeft" }
    ]
  },
  guest_booking_approval: {
    message: "### **Booking Approval Policy**\n* **Host Approval**: Every booking request is sent to the host. The host must approve or reject it within **24 hours**.\n* **Expirations**: If a host fails to respond in 24 hours, the request expires automatically.\n* **No Advance Fee**: You are only charged *after* the host approves the request.",
    options: [
      { label: "Can I reschedule dates?", next: "guest_booking_reschedule", icon: "calendar" },
      { label: "Back to Guest Menu", next: "guest_main", icon: "arrowLeft" }
    ]
  },
  guest_booking_reschedule: {
    message: "### **Rescheduling & Modifications**\n* **Before Host Approval**: You can cancel and submit a new request with updated dates anytime.\n* **After Payment**: Modifications require host consent. If the host agrees, our support team can adjust dates on the backend.\n* **Pricing Difference**: If the new dates have higher weekend rates, the difference must be paid via a secure payment link.",
    options: [
      { label: "How does approval work?", next: "guest_booking_approval", icon: "clock" },
      { label: "Back to Guest Menu", next: "guest_main", icon: "arrowLeft" }
    ]
  },
  guest_categories: {
    message: "### **Categories & House Rules**\nWe list three premium categories:\n\n1. **Residential Stays**: Villas, apartments, and farmhouses.\n2. **Commercial Spaces**: Co-working desks, private cabins, and meeting rooms.\n3. **Event Venues**: Open lawns, banquet halls, and rooftops.\n\nChoose below to learn about specific rules:",
    options: [
      { label: "Rules for Events & Shoots", next: "guest_event_rules", icon: "scale" },
      { label: "Discounts on Workspaces", next: "guest_workspace_discounts", icon: "dollar" },
      { label: "Back to Guest Menu", next: "guest_main", icon: "arrowLeft" }
    ]
  },
  guest_event_rules: {
    message: "### **Event & Shoot Rules**\n* **Guest Limit**: Every venue has a strict maximum capacity. Exceeding it will incur heavy penalties.\n* **Music & Noise**: Outdoor music/DJ must stop by **10:00 PM** in accordance with local regulations.\n* **Catering/Decor**: You can bring external caterers and decorators only if pre-approved by the host.",
    options: [
      { label: "Discounts on Workspaces", next: "guest_workspace_discounts", icon: "dollar" },
      { label: "Back to Guest Menu", next: "guest_main", icon: "arrowLeft" }
    ]
  },
  guest_workspace_discounts: {
    message: "### **Workspace Long-term Discounts**\n* **Weekly Desks**: Save **10-15%** on booking co-working desks or cabins for 7+ consecutive days.\n* **Monthly Rates**: Save up to **30%** on bookings of 30+ days.\n* **Corporate Rates**: Contact [support@x-space360.com](mailto:support@x-space360.com) for special bulk discounts for teams.",
    options: [
      { label: "Rules for Events & Shoots", next: "guest_event_rules", icon: "scale" },
      { label: "Back to Guest Menu", next: "guest_main", icon: "arrowLeft" }
    ]
  },
  guest_refunds: {
    message: "### **Payments & Refunds**\nAll transactions are securely processed via Razorpay:\n\n* **Service Fee**: A **10% Premium Service Fee** is added to the base booking price at checkout.\n* **Cancellation & Refund Rules**:\n  * **100% Refund**: Cancel up to 48 hours before check-in (Premium Service Fee is non-refundable).\n  * **50% Refund**: Cancel between 24-48 hours before check-in.\n  * **No Refund**: Cancel less than 24 hours prior to check-in.",
    options: [
      { label: "How to claim a refund?", next: "guest_refund_claim", icon: "refresh" },
      { label: "Security Deposit refunds", next: "guest_security_refund", icon: "shieldAlert" },
      { label: "Back to Guest Menu", next: "guest_main", icon: "arrowLeft" }
    ]
  },
  guest_refund_claim: {
    message: "### **How to Claim Your Refund**\n1. Go to **Dashboard** $\\rightarrow$ **My Bookings**.\n2. Locate your booking and click **Cancel Booking**.\n3. The system will calculate your refund percentage based on the cancellation window.\n4. Approved refunds are initiated immediately and take **5-7 business days** to reflect in your source payment account.",
    options: [
      { label: "Security Deposit refunds", next: "guest_security_refund", icon: "shieldAlert" },
      { label: "Back to Guest Menu", next: "guest_main", icon: "arrowLeft" }
    ]
  },
  guest_security_refund: {
    message: "### **Security Deposit Refund Policy**\n* **Collection**: Hosts may charge a security deposit for high-value properties (villas/banquets) to cover potential damage.\n* **Refund Timing**: The deposit is fully refunded by the host within **48 hours of check-out** after inspection.\n* **Disputes**: In case of damage claims, hosts must submit photo evidence to X-Space360 within 24 hours.",
    options: [
      { label: "How to claim a refund?", next: "guest_refund_claim", icon: "refresh" },
      { label: "Back to Guest Menu", next: "guest_main", icon: "arrowLeft" }
    ]
  },

  // ==================== HOST FLOWS ====================
  host_main: {
    message: "### **Host Support Menu**\nWelcome Host! How can we help you manage your properties, payments, or account verification?",
    options: [
      { label: "Host Onboarding & KYC", next: "host_onboarding", icon: "shield" },
      { label: "Listing a Space & Map Pinning", next: "host_listing", icon: "layers" },
      { label: "Subscription Plans & Free Trial", next: "host_subscriptions", icon: "dollar" },
      { label: "Payouts, Earnings & Taxes", next: "host_payouts", icon: "creditCard" },
      { label: "Back to Main Menu", next: "main", icon: "arrowLeft" }
    ]
  },
  host_onboarding: {
    message: "### **Host Registration & KYC Verification**\nTo list your property, you need a verified host account:\n\n1. Register as a host on the [Registration Page](/register).\n2. Head to your **Host Dashboard** $\\rightarrow$ **Verification** tab.\n3. Upload clear copies of Aadhaar, PAN, Address Proof, and Shop Act.\n4. Admin will review within 24-48 hours.",
    options: [
      { label: "Why is Shop Act mandatory?", next: "host_shop_act", icon: "badgeInfo" },
      { label: "KYC Rejection reasons", next: "host_kyc_rejections", icon: "shieldAlert" },
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },
  host_shop_act: {
    message: "### **Shop Act License Requirement**\n* **Why is it required?**: Under local commercial laws in Maharashtra and major states, commercial leasing/renting of event venues or short-term properties requires a local municipal registration.\n* **Alternatives**: If you do not have a Shop Act, you can upload a **GST registration certificate** or a **NOC from the local Gram Panchayat/Municipality**.",
    options: [
      { label: "KYC Rejection reasons", next: "host_kyc_rejections", icon: "shieldAlert" },
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },
  host_kyc_rejections: {
    message: "### **Common KYC Rejection Reasons**\n1. **Blurred Images**: Upload high-resolution, readable documents.\n2. **Name Mismatch**: The name on the bank account must match the Aadhaar and PAN.\n3. **Incorrect Address Proof**: Electricity bill or deed must match the listing address.\n4. **Expired Licenses**: Ensure municipal NOC or Shop Act is current.",
    options: [
      { label: "Why is Shop Act mandatory?", next: "host_shop_act", icon: "badgeInfo" },
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },
  host_listing: {
    message: "### **How to List a Property**\nOnce approved as a host, follow these steps to list your property:\n\n1. Go to your Dashboard and click **+ List New Property**.\n2. Choose Category (Residential, Commercial, or Event Venue).\n3. Add basic pricing, security deposit, and description.\n4. Select your amenities and upload high-resolution images.\n5. Select your location on our Leaflet Map.",
    options: [
      { label: "Listing Guidelines", next: "host_listing_guidelines", icon: "fileText" },
      { label: "How to edit active listings?", next: "host_listing_edit", icon: "pencil" },
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },
  host_listing_guidelines: {
    message: "### **Property Listing Guidelines**\n* **Photos**: Upload at least **5 high-resolution photos** showing the interior, exterior, and bathroom. Blurred photos will be rejected.\n* **Accuracy**: Set the map marker precisely. Inaccurate locations can lead to cancellation disputes.\n* **Description**: Be detailed about house rules, check-in/out times, and extra guest charges.",
    options: [
      { label: "How to edit active listings?", next: "host_listing_edit", icon: "pencil" },
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },
  host_listing_edit: {
    message: "### **Editing Active Listings**\n* **Simple Changes**: Go to **My Listings** $\\rightarrow$ **Edit** to modify descriptions, change daily rates, or toggle amenities instantly.\n* **Calendar Blockout**: Use the Calendar tab to block out specific dates when your property is unavailable (e.g. for maintenance or personal use).\n* **Map Location**: Modifying the map coordinates requires re-approval by the admin.",
    options: [
      { label: "Listing Guidelines", next: "host_listing_guidelines", icon: "fileText" },
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },
  host_subscriptions: {
    message: "### **Hosting Fees & Subscription Plans**\n* **Promotional Offer**: Listing your property and hosting on X-Space360 is **completely FREE until December 2026**! No subscription or membership fees apply during this launch phase.\n* **Post-Promo BHK Plans**: Standard BHK-specific plans (₹999/mo for Studio/1BHK, ₹1,999/mo for 2/3BHK) will only commence starting January 2027.",
    options: [
      { label: "Subscription renewals post-promo", next: "host_sub_renewals", icon: "alert" },
      { label: "Upgrading/Downgrading plans", next: "host_sub_changes", icon: "pencil" },
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },
  host_sub_renewals: {
    message: "### **Subscription Renewal (Post-Promo)**\n* **Auto-Billing**: Subscriptions will auto-renew monthly via stored Razorpay credentials once active in 2027.\n* **Grace Period**: If a renewal payment fails, you receive a **3-day grace period** to clear dues before listings are hidden.",
    options: [
      { label: "Upgrading/Downgrading plans", next: "host_sub_changes", icon: "pencil" },
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },
  host_sub_changes: {
    message: "### **Upgrading/Downgrading BHK Plans**\n* **Upgrades**: Calculate pro-rata difference for the remaining active days in the current cycle.\n* **Downgrades**: Active from the next monthly billing cycle.",
    options: [
      { label: "Subscription renewals post-promo", next: "host_sub_renewals", icon: "alert" },
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },
  host_payouts: {
    message: "### **Payouts & Platform Commission**\n* **Zero Host Commission**: X-Space360 does **not deduct any platform fees or commissions** from your listed prices. You receive **100%** of your property's daily/nightly base rates!\n* **Guest Booking Fee**: A **10% Premium Service Fee** is charged directly to the Guest / Customer during checkout.\n* **Schedule**: Transferred directly to your verified bank account within **3 business days** after guest check-out.\n* **Government TDS**: 1% TDS is deducted under Section 194O of the IT Act (claimable in your annual ITR).",
    options: [
      { label: "GST & Tax Regulations", next: "host_tax_details", icon: "bank" },
      { label: "Delayed Payout Troubleshooting", next: "host_delayed_payout", icon: "alert" },
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },
  host_tax_details: {
    message: "### **GST & Indian Tax Regulations**\n* **TDS under 194O**: As an e-commerce platform, we deduct **1% TDS** on the gross booking amount and file it against your PAN. You can claim this refund during your ITR filing.\n* **GST**: Hosts are responsible for filing GST on renting commercial/residential properties if their annual turnover exceeds the threshold (₹20 Lakhs).",
    options: [
      { label: "Delayed Payout Troubleshooting", next: "host_delayed_payout", icon: "alert" },
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },
  host_delayed_payout: {
    message: "### **Delayed Payout Troubleshooting**\nIf your payout has not arrived in 3 business days, check the following:\n\n1. **Bank Verification**: Ensure your IFSC code and account number are correct on your dashboard.\n2. **Bank Holidays**: Payouts are not processed on Saturdays, Sundays, and national holidays.\n3. **Guest Disputes**: If a guest files a major dispute/claim regarding amenities, payouts may be temporarily held until resolved.",
    options: [
      { label: "GST & Tax Regulations", next: "host_tax_details", icon: "bank" },
      { label: "Back to Host Menu", next: "host_main", icon: "arrowLeft" }
    ]
  },

  // ==================== SUPPORT FLOW ====================
  support: {
    message: "### **Contact X-Space360 Helpdesk**\nIf you have any specific query or need direct escalation, contact our team:\n\n* **Helpline**: [+91 8484826247](tel:+918484826247) (9 AM - 7 PM)\n* **Email Support**: [support@x-space360.com](mailto:support@x-space360.com)\n* **Grievance Desk**: Escalations to Nodal Officer Amit Sharma at [nodal@x-space360.com](mailto:nodal@x-space360.com)",
    options: [
      { label: "Main Menu", next: "main", icon: "home" }
    ]
  }
};

const getLocalResponse = (query) => {
  const q = query.toLowerCase();
  
  if (q.includes('onboard') || q.includes('step') || q.includes('register') || q.includes('signup') || q.includes('kyc') || q.includes('document') || q.includes('aadhaar') || q.includes('pan') || q.includes('license')) {
    return FLOWS.host_onboarding.message;
  }
  
  if (q.includes('list') || q.includes('add') || q.includes('property') || q.includes('space') || q.includes('villa') || q.includes('kashi') || q.includes('karychi') || q.includes('host')) {
    return FLOWS.host_listing.message;
  }
  
  if (q.includes('sub') || q.includes('plan') || q.includes('price') || q.includes('fee') || q.includes('charge') || q.includes('pay') || q.includes('cost')) {
    return FLOWS.host_subscriptions.message;
  }
  
  if (q.includes('refund') || q.includes('cancel') || q.includes('book') || q.includes('policy')) {
    return FLOWS.guest_refunds.message;
  }
  
  if (q.includes('contact') || q.includes('support') || q.includes('help') || q.includes('phone') || q.includes('email') || q.includes('officer') || q.includes('nodal') || q.includes('number') || q.includes('call')) {
    return FLOWS.support.message;
  }
  
  return `### **X-Space360 Assistant**\nI'm here to help you. Since I couldn't find a direct match for your question, you can choose one of the quick links below:\n\n* **Host Registration & Verification Steps**\n* **How to List a Property**\n* **Subscription Pricing & Plans**\n* **Refund and Booking Cancellation Policy**\n* **Contact Support & Grievances**\n\nOr try rephrasing your question using simple keywords like *onboard*, *list*, *plans*, *refund*, or *contact*.`;
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
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

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

  const sendQuery = (queryText) => {
    if (!queryText.trim()) return;

    const newMessages = [...messages, { role: 'user', content: queryText }];
    setMessages(newMessages);
    setIsTyping(true);

    setTimeout(() => {
      const fallbackReply = getLocalResponse(queryText);
      setMessages([
        ...newMessages, 
        { 
          role: 'model', 
          content: fallbackReply, 
          options: [
            { label: "Go to Main Menu", next: "main", icon: "home" },
            { label: "Contact Support Desk", next: "support", icon: "phone" }
          ]
        }
      ]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[380px] h-[600px] max-h-[85vh] max-w-[calc(100vw-2rem)] bg-white border border-gray-200 shadow-elevated rounded-3xl flex flex-col mb-4 overflow-hidden animate-scale-up z-50">
          
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
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-gray-400 hover:text-white border-none bg-transparent"
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
                            className="w-full text-left px-4 py-2.5 bg-white hover:bg-terracotta hover:text-white text-charcoal font-bold text-xs rounded-xl border border-[#EAE3D2] transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between shadow-sm"
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

          {/* Input Bar */}
          <div className="p-4 bg-white border-t border-gray-100 flex flex-col space-y-2 z-10 shadow-inner">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!input.trim() || isTyping) return;
                sendQuery(input);
                setInput('');
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question..."
                disabled={isTyping}
                className="flex-1 px-4 py-2.5 bg-gray-100/50 border border-gray-200 rounded-xl text-sm font-semibold text-charcoal focus:outline-none focus:ring-1 focus:ring-terracotta disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isTyping || !input.trim()}
                className="p-2.5 bg-[#1E1E1E] hover:bg-black text-white font-bold rounded-xl transition-all duration-200 disabled:opacity-50 cursor-pointer shadow-md flex items-center justify-center border-none"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </form>
            <div className="text-center mt-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Powered by X-Space360 Helpdesk</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      {!isOpen && (
        <div className="relative group">
          {/* Pulsing ring background */}
          <span className="absolute -inset-1 rounded-full bg-gradient-to-tr from-terracotta to-amber-500 opacity-30 blur animate-pulse group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></span>
          <button
            id="chatbot-toggle-btn"
            onClick={() => setIsOpen(true)}
            className="relative chatbot-trigger w-16 h-16 rounded-full bg-gradient-to-tr from-terracotta to-amber-500 shadow-elevated flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer border-none"
          >
            <MessageSquare className="w-7 h-7 text-white" />
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;
