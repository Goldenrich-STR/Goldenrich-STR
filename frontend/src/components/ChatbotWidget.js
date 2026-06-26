import React, { useState, useRef, useEffect } from 'react';
import { X, Send, MessageSquare, Sparkles, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const API_KEY = "AIzaSyCu3Er_L9IxUOO7mztXIW-5qMM_BB-eukQ";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

const SYSTEM_INSTRUCTION = "You are the X-Space360 Assistant, a helpful, professional, and sophisticated AI assistant for the X-Space360 platform. X-Space360 is a premium platform for booking luxury properties across India, including Villas & Resorts, Residential Stays, Commercial Spaces, Wedding Venues, and Banquet Halls. Do not mention that you are an AI model developed by Google or Gemini. Do not use emojis in your responses. Use clear, concise text and markdown formatting (like bolding and lists) where appropriate to make information readable. Provide helpful answers related to property booking, hosting, subscriptions, and platform features.";

const QUICK_OPTIONS = [
  { label: 'Host Onboarding Steps', query: 'What are the steps to list my property and onboard as a host?' },
  { label: 'List Property Details', query: 'How do I list my property details?' },
  { label: 'Subscription Plans', query: 'What subscription plans do you offer for hosts?' },
  { label: 'Bookings & Refund', query: 'How do bookings and refund policies work?' }
];

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
        setMessages([...newMessages, { role: 'model', content: "I am currently unable to process your request. Please try again later." }]);
      }

    } catch (error) {
      console.error('Chatbot API Error:', error);
      setMessages([...newMessages, { role: 'model', content: "I am experiencing network difficulties. Please check your connection or try again." }]);
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
              <div className="w-8 h-8 rounded-full bg-charcoal flex items-center justify-center shadow-subtle">
                <Sparkles className="w-4 h-4 text-white" />
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
                  <div className="w-6 h-6 rounded-full bg-charcoal flex items-center justify-center shrink-0 mr-3 mt-1 shadow-sm">
                    <Sparkles className="w-3 h-3 text-white" />
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
                <div className="w-6 h-6 rounded-full bg-charcoal flex items-center justify-center shrink-0 mr-3 mt-1 shadow-sm">
                  <Sparkles className="w-3 h-3 text-white" />
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
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-charcoal flex items-center justify-center hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
              >
                {isTyping ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white ml-0.5" />}
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
          className="w-16 h-16 rounded-full bg-charcoal hover:bg-black shadow-elevated flex items-center justify-center transition-transform hover:scale-[1.02] cursor-pointer"
        >
          <MessageSquare className="w-7 h-7 text-white" />
        </button>
      )}
    </div>
  );
};

export default ChatbotWidget;
