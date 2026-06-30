import React, { useState, useRef, useEffect } from 'react';
import { X, Send, MessageSquare, Sparkles, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const API_KEY = atob("QVEuQWI4Uk42SWJzZnpmVm5rbnoxc0std1lDczN3UnNNWjVCM1ZZWFkwLUdqYkJYQ0ljZ0F3");
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

const SYSTEM_INSTRUCTION = "You are the X-Space360 Assistant, a helpful, professional, and sophisticated AI assistant for the X-Space360 platform. X-Space360 is a premium platform for booking luxury properties across India, including Villas & Resorts, Residential Stays, Commercial Spaces, Wedding Venues, and Banquet Halls. Do not mention that you are an AI model developed by Google or Gemini. Do not use emojis in your responses. Use clear, concise text and markdown formatting (like bolding and lists) where appropriate to make information readable. Provide helpful answers related to property booking, hosting, subscriptions, and platform features.";

const QUICK_OPTIONS = [
  { label: 'Host Onboarding Steps', query: 'What are the steps to list my property and onboard as a host?' },
  { label: 'List Property Details', query: 'How do I list my property details?' },
  { label: 'Subscription Plans', query: 'What subscription plans do you offer for hosts?' },
  { label: 'Bookings & Refund', query: 'How do bookings and refund policies work?' }
];

const getLocalResponse = (query) => {
  const q = query.toLowerCase();
  
  if (q.includes('onboard') || q.includes('step') || q.includes('register') || q.includes('signup') || q.includes('kyc') || q.includes('document') || q.includes('aadhaar') || q.includes('pan') || q.includes('license')) {
    return `### **Host Onboarding Steps**
To list your property and start hosting on **X-Space360**, follow these simple steps:

1. **Sign Up / Register**: Create a host account at the [Registration Page](/register).
2. **KYC & Verification**: Navigate to your Dashboard and submit:
   * **Aadhaar Card** & **PAN Card**
   * **Property Ownership Proof** (Index-2 or Sale Deed)
   * **Electricity Bill** (matching the address)
   * **Shop Act License** *(Mandatory)*
3. **Wait for Approval**: Our admin team will verify your documents within 24-48 hours.
4. **Subscribe to a Plan**: Choose a BHK-specific plan from your billing tab.
5. **Go Live**: Create your property listing and start receiving bookings!`;
  }
  
  if (q.includes('list') || q.includes('add') || q.includes('property') || q.includes('space') || q.includes('villa') || q.includes('kashi') || q.includes('karychi') || q.includes('host')) {
    return `### **How to List Your Property**
Once your account is verified, you can list any residential, commercial, or event space:

1. Go to your **Host Dashboard**.
2. Click on **"+ List New Property"**.
3. Fill in the required details:
   * **Category**: Residential, Commercial, or Event Venue.
   * **Pricing**: Set your daily/nightly base rates and security deposit.
   * **Location**: Provide geo-coordinates or pin it on our Leaflet map.
   * **Amenities**: Select from Wi-Fi, power backup, parking, workspace, etc.
   * **Images**: Upload high-quality photos of your space.
4. Click **Submit** for admin review. Once approved, it will be visible to guests!`;
  }
  
  if (q.includes('sub') || q.includes('plan') || q.includes('price') || q.includes('fee') || q.includes('charge') || q.includes('pay') || q.includes('cost')) {
    return `### **Host Subscription Plans**
We offer BHK-specific and space-specific plans to match your property type:

| Plan Type | Description | Pricing Cycle |
| :--- | :--- | :--- |
| **Studio / 1 BHK** | Ideal for small residential apartments | Monthly / Annual |
| **2 BHK / 3 BHK** | Standard villa or multi-room apartment | Monthly / Annual |
| **Commercial Space** | Co-working setups and office cabins | Flat Fee / Flexible |
| **Event Venue** | Banquet halls and terrace rooftops | Premium rates |

*Visit your Host Dashboard under the **Subscription & Billing** tab to select and activate your plan.*`;
  }
  
  if (q.includes('refund') || q.includes('cancel') || q.includes('book') || q.includes('policy')) {
    return `### **Bookings & Refund Policies**
* **For Guests**: Select dates, choose options, and submit a booking request. Payment is securely processed via Razorpay.
* **Cancellation**:
  * **Full Refund**: If cancelled up to 48 hours before check-in.
  * **50% Refund**: If cancelled between 24-48 hours.
  * **No Refund**: If cancelled less than 24 hours prior to check-in.
* **For Hosts**: Payouts are auto-processed to your verified bank account within 3 business days post guest check-out.`;
  }
  
  if (q.includes('contact') || q.includes('support') || q.includes('help') || q.includes('phone') || q.includes('email') || q.includes('officer') || q.includes('nodal') || q.includes('number') || q.includes('call')) {
    return `### **Contact Support & Grievance**
Our support desk is operational 9:00 AM - 7:00 PM.

* **Email Support**: [support@x-space360.com](mailto:support@x-space360.com)
* **Phone Support**: [+91 8484826247](tel:+918484826247)
* **Grievance Officer**: Amit Sharma (for escalations)
* **Nodal Officer Email**: [nodal@x-space360.com](mailto:nodal@x-space360.com)`;
  }
  
  return `### **X-Space360 Assistant**
I'm here to help you. Since I couldn't find a direct match for your question, you can choose one of the quick links below:

* **Host Registration & Verification Steps**
* **How to List a Property**
* **Subscription Pricing & Plans**
* **Refund and Booking Cancellation Policy**
* **Contact Support & Grievances**

Or try rephrasing your question using simple keywords like *onboard*, *list*, *plans*, *refund*, or *contact*.`;
};

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'model', content: "Welcome to X-Space360. How can I assist you with your property search or hosting needs today?" }
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
  }, [messages, isOpen]);

  const sendQuery = async (queryText) => {
    if (!queryText.trim()) return;

    const newMessages = [...messages, { role: 'user', content: queryText }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      // Prepare history for Gemini API
      const contents = newMessages.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const payload = {
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }]
        },
        contents: contents,
        generationConfig: {
          temperature: 0.7,
        }
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        const botReply = data.candidates[0].content.parts[0].text;
        setMessages([...newMessages, { role: 'model', content: botReply }]);
      } else {
        const fallbackReply = getLocalResponse(queryText);
        setMessages([...newMessages, { role: 'model', content: fallbackReply }]);
      }

    } catch (error) {
      console.error('Chatbot API Error:', error);
      const fallbackReply = getLocalResponse(queryText);
      setMessages([...newMessages, { role: 'model', content: fallbackReply }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const currentInput = input;
    setInput('');
    await sendQuery(currentInput);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[380px] h-[600px] max-h-[80vh] max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-xl border border-gray-200 shadow-elevated rounded-3xl flex flex-col mb-4 overflow-hidden animate-fade-in-up">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 shadow-sm z-10">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-terracotta flex items-center justify-center shadow-subtle">
                <Sparkles className="w-4 h-4 text-charcoal" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-charcoal tracking-tight leading-tight">X-Space360</h3>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Assistant</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-5 overflow-y-auto bg-gray-50/50 space-y-6 relative">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'model' && (
                  <div className="w-6 h-6 rounded-full bg-terracotta flex items-center justify-center shrink-0 mr-3 mt-1 shadow-sm">
                    <Sparkles className="w-3 h-3 text-charcoal" />
                  </div>
                )}
                <div 
                  className={`max-w-[85%] rounded-3xl px-5 py-3.5 text-[14px] leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-charcoal text-white rounded-tr-sm' 
                      : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'
                  }`}
                >
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-a:text-terracotta prose-a:no-underline hover:prose-a:underline prose-strong:text-current">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-terracotta flex items-center justify-center shrink-0 mr-3 mt-1 shadow-sm">
                  <Sparkles className="w-3 h-3 text-charcoal" />
                </div>
                <div className="bg-white border border-gray-100 rounded-3xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center space-x-1.5">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Options */}
          {messages.length === 1 && (
            <div className="px-4 pb-3 pt-1 bg-white flex flex-wrap gap-2 border-t border-transparent z-10">
              {QUICK_OPTIONS.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => sendQuery(opt.query)}
                  className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full text-xs font-semibold text-charcoal transition-colors cursor-pointer shadow-sm"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className={`p-4 bg-white z-10 ${messages.length > 1 ? 'border-t border-gray-100' : ''}`}>
            <form 
              onSubmit={handleSend}
              className="flex items-center relative"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message X-Space360..."
                className="w-full bg-gray-50 border border-gray-200 rounded-full pl-5 pr-12 py-3.5 text-[14px] text-charcoal focus:outline-none focus:ring-1 focus:ring-charcoal focus:border-charcoal transition-shadow placeholder-gray-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-terracotta flex items-center justify-center hover:bg-terracotta-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
              >
                {isTyping ? <Loader2 className="w-4 h-4 text-charcoal animate-spin" /> : <Send className="w-4 h-4 text-charcoal ml-0.5" />}
              </button>
            </form>
            <div className="text-center mt-3">
              <span className="text-[10px] font-semibold text-gray-400">Powered by X-Space360 Intelligence</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-full bg-terracotta hover:bg-terracotta-hover shadow-elevated flex items-center justify-center transition-transform hover:scale-[1.02] cursor-pointer"
        >
          <MessageSquare className="w-7 h-7 text-charcoal" />
        </button>
      )}
    </div>
  );
};

export default ChatbotWidget;
