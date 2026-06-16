import React, { useState, useEffect, useRef, useCallback } from 'react';
import { aiCallAPI } from '../../services/api';
import { 
  Plus, Phone, Search, RefreshCw, CheckCircle, 
  X, Filter, Volume2, Sparkles, Trash, Eye
} from 'lucide-react';

const AICallsManagement = () => {
  const [calls, setCalls] = useState([]);
  const [agents, setAgents] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('logs');
  const [loading, setLoading] = useState(false);
  
  // Modals
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // Form
  const [formData, setFormData] = useState({
    agent_name: '',
    voice_type: 'Neural',
    language: 'English',
    greeting_message: 'Namaste',
    external_voice_name: ''
  });

  const [systemVoices, setSystemVoices] = useState([]);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadSystemVoices = () => {
        setSystemVoices(window.speechSynthesis.getVoices() || []);
      };
      loadSystemVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadSystemVoices);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadSystemVoices);
      };
    }
  }, []);

  const fetchCalls = useCallback(async ({ showLoader = false } = {}) => {
    if (showLoader) setLoading(true);
    try {
      const res = await aiCallAPI.getAllCalls();
      setCalls(res.data.calls || []);
    } catch (err) {
      console.error('Failed to fetch AI calls', err);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await aiCallAPI.getAgents();
      setAgents(res.data.agents || []);
    } catch (err) {
      console.error('Failed to fetch AI agents', err);
    }
  }, []);

  useEffect(() => {
    fetchCalls({ showLoader: true });
    fetchAgents();

    // Keep the list fresh in the background without replacing the table with a loader.
    const intervalId = setInterval(() => {
      fetchCalls();
      fetchAgents();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [fetchCalls, fetchAgents]);

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    try {
      await aiCallAPI.createAgent(formData);
      setShowAgentModal(false);
      setFormData({
        agent_name: '',
        voice_type: 'Neural',
        language: 'English',
        greeting_message: 'Namaste',
        external_voice_name: ''
      });
      fetchAgents();
      alert('AI Agent created successfully');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create AI Agent');
    }
  };

  const handleActivateAgent = async (agentId) => {
    try {
      await aiCallAPI.activateAgent(agentId);
      fetchAgents();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to activate AI Agent');
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!window.confirm('Are you sure you want to delete this AI Agent?')) return;
    try {
      await aiCallAPI.deleteAgent(agentId);
      fetchAgents();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete AI Agent');
    }
  };

  const filteredCalls = calls.filter(c => {
    const matchesSearch = c.recipient_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.booking_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.phone && c.phone.includes(searchQuery));
    const matchesRole = filterRole === 'all' ? true : c.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-sand-200 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-black text-charcoal">AI Calling Concierge</h2>
          <p className="text-charcoal-muted">Simulate and configure automated AI voice confirmation calls for bookings.</p>
        </div>
        <button 
          onClick={() => setShowAgentModal(true)}
          className="btn-premium flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Create AI Agent</span>
        </button>
      </div>

      {/* Sub tabs navigation */}
      <div className="flex space-x-2 border-b border-sand-200">
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex items-center space-x-2 px-4 py-3 font-semibold transition-all ${
            activeSubTab === 'logs'
              ? 'text-terracotta border-b-2 border-terracotta font-black'
              : 'text-charcoal-light hover:text-charcoal'
          }`}
        >
          <Phone className="w-4 h-4" />
          <span>Call Simulation Logs</span>
        </button>
        <button
          onClick={() => setActiveSubTab('agents')}
          className={`flex items-center space-x-2 px-4 py-3 font-semibold transition-all ${
            activeSubTab === 'agents'
              ? 'text-terracotta border-b-2 border-terracotta font-black'
              : 'text-charcoal-light hover:text-charcoal'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Calling Agents</span>
        </button>
      </div>

      {/* Dynamic Tab Contents */}
      {activeSubTab === 'logs' ? (
        <div className="bg-white rounded-[2rem] border border-sand-200 shadow-sm overflow-hidden flex flex-col">
          {/* Search & Filter bar */}
          <div className="p-5 border-b border-sand-200 bg-sand-50 flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 relative w-full">
              <Search className="w-5 h-5 text-charcoal-muted absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Search logs by recipient, booking ID, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-sand-200 outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 text-sm font-bold text-charcoal placeholder:font-semibold placeholder:text-charcoal-light py-3 pl-11 pr-4 rounded-xl transition-all"
              />
            </div>
            <div className="flex items-center bg-white border border-sand-200 rounded-xl px-3 py-1 text-sm font-bold text-charcoal focus-within:border-terracotta focus-within:ring-2 focus-within:ring-terracotta/20 transition-all">
              <Filter className="w-4 h-4 text-charcoal-muted mr-2" />
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                className="bg-transparent border-none outline-none py-2 cursor-pointer font-bold"
              >
                <option value="all">All Roles</option>
                <option value="guest">Guests</option>
                <option value="host">Hosts</option>
              </select>
            </div>
          </div>

          {/* Call Logs List */}
          {loading ? (
            <div className="flex flex-col justify-center items-center py-20 text-charcoal-muted">
               <RefreshCw className="w-8 h-8 animate-spin mb-4 text-terracotta" />
               <p className="font-medium">Loading call logs...</p>
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="text-center py-20">
              <Phone className="w-12 h-12 text-sand-300 mx-auto mb-4 animate-pulse" />
              <h3 className="text-xl font-bold text-charcoal mb-2">No Call Logs Found</h3>
              <p className="text-charcoal-muted">Simulated AI calls will be recorded here when bookings are confirmed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-sand-50 border-b border-sand-200">
                    <th className="px-6 py-4 text-xs font-black text-charcoal uppercase tracking-widest">Booking ID</th>
                    <th className="px-6 py-4 text-xs font-black text-charcoal uppercase tracking-widest">Recipient</th>
                    <th className="px-6 py-4 text-xs font-black text-charcoal uppercase tracking-widest">Agent Name</th>
                    <th className="px-6 py-4 text-xs font-black text-charcoal uppercase tracking-widest">Phone</th>
                    <th className="px-6 py-4 text-xs font-black text-charcoal uppercase tracking-widest">Duration</th>
                    <th className="px-6 py-4 text-xs font-black text-charcoal uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-100">
                  {filteredCalls.map((call) => (
                    <tr key={call.call_id} className="hover:bg-sand-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-black text-charcoal">{call.booking_id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-bold text-charcoal">{call.recipient_name}</div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase mt-0.5 ${
                            call.role === 'guest' ? 'bg-terracotta/10 text-terracotta' : 'bg-sage/10 text-sage'
                          }`}>
                            {call.role}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-charcoal flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-terracotta" /> {call.agent_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-charcoal-light">
                        {call.phone}
                      </td>
                      <td className="px-6 py-4 font-bold text-charcoal">
                        {call.duration_seconds}s
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedCall(call)}
                          className="inline-flex items-center text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View Log
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* AI Calling Agents tab view */
        <div className="bg-white rounded-[2rem] border border-sand-200 shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black text-charcoal">Voice Calling Agents</h3>
              <p className="text-sm text-charcoal-muted mt-1">Configure prompt profiles, genders, languages, and custom greetings.</p>
            </div>
          </div>

          {agents.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-sand-200 rounded-3xl">
              <Sparkles className="w-12 h-12 text-sand-300 mx-auto mb-4 animate-spin" />
              <h4 className="text-lg font-bold text-charcoal mb-2">No AI Agents Configured</h4>
              <p className="text-charcoal-muted max-w-sm mx-auto">Create a calling agent configuration to customize confirmation calls.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent) => (
                <div 
                  key={agent.agent_id} 
                  className={`border-2 rounded-3xl p-6 transition-all flex flex-col justify-between h-[300px] relative overflow-hidden ${
                    agent.is_active 
                      ? 'border-terracotta bg-terracotta/5 shadow-md' 
                      : 'border-sand-200 bg-white hover:border-sand-300 hover:shadow-sm'
                  }`}
                >
                  {agent.is_active && (
                    <div className="absolute top-0 right-0 bg-terracotta text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow">
                      Active
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="p-2.5 bg-sand-100 rounded-2xl text-terracotta">
                        <Volume2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-black text-lg text-charcoal leading-tight">{agent.agent_name}</h4>
                        <span className="text-[10px] font-black uppercase tracking-wider text-charcoal-light block mt-0.5">
                          {agent.external_voice_name ? `External (${agent.external_voice_name})` : agent.voice_type} • {agent.language}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4 bg-sand-50 p-4 rounded-2xl border border-sand-200/50">
                      <span className="block text-[9px] font-black uppercase tracking-wider text-charcoal-muted">Greeting Greeting</span>
                      <p className="text-xs font-semibold text-charcoal italic line-clamp-3">"{agent.greeting_message}"</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-sand-200/60 pt-4 mt-auto">
                    {!agent.is_active ? (
                      <button
                        onClick={() => handleActivateAgent(agent.agent_id)}
                        className="flex-1 py-2 px-3 rounded-xl bg-charcoal hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer text-center"
                      >
                        Set Active
                      </button>
                    ) : (
                      <div className="flex-1 inline-flex items-center justify-center text-green-700 bg-green-50 border border-green-200 py-2 rounded-xl text-xs font-black uppercase">
                        <CheckCircle className="w-3.5 h-3.5 mr-1 text-green-600" /> Currently Active
                      </div>
                    )}
                    <button
                      onClick={() => handleDeleteAgent(agent.agent_id)}
                      className="p-2.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-500 transition cursor-pointer"
                      title="Delete Agent"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create AI Agent Modal */}
      {showAgentModal && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-xl w-full shadow-premium animate-slide-up relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-terracotta/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
            
            <div className="flex justify-between items-center mb-8 relative z-10">
              <div>
                <h3 className="text-2xl font-black text-charcoal tracking-tight">New AI Calling Agent</h3>
                <p className="text-sm text-charcoal-muted mt-1">Configure voice profile and greetings below.</p>
              </div>
              <button 
                onClick={() => setShowAgentModal(false)} 
                className="w-10 h-10 bg-sand-100 text-charcoal rounded-full flex items-center justify-center hover:bg-sand-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 relative z-10">
              <div className="space-y-2">
                <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1">Agent Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.agent_name}
                  onChange={e => setFormData({...formData, agent_name: e.target.value})}
                  className="w-full border-2 border-sand-200 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
                  placeholder="e.g. Mayur Voice AI"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1">Voice Profile</label>
                <select 
                  value={formData.voice_type}
                  onChange={e => setFormData({...formData, voice_type: e.target.value})}
                  className="w-full border-2 border-sand-200 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
                >
                  <option value="Neural">Neural (Standard)</option>
                  <option value="Male">Male Voice</option>
                  <option value="Female">Female Voice</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1">Language</label>
                <select 
                  value={formData.language}
                  onChange={e => setFormData({...formData, language: e.target.value})}
                  className="w-full border-2 border-sand-200 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition font-bold"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi (हिंदी)</option>
                  <option value="Marathi">Marathi (मराठी)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1">External Voice (Optional)</label>
                <select 
                  value={formData.external_voice_name || ''}
                  onChange={e => setFormData({...formData, external_voice_name: e.target.value})}
                  className="w-full border-2 border-sand-200 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition font-bold"
                >
                  <option value="">None (Use default heuristics)</option>
                  {systemVoices.map(v => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1">Greeting Prefix</label>
                <input 
                  type="text" 
                  required
                  value={formData.greeting_message}
                  onChange={e => setFormData({...formData, greeting_message: e.target.value})}
                  className="w-full border-2 border-sand-200 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
                  placeholder="e.g. Namaste / Hello / Sasriyakaal"
                />
                <p className="text-[10px] text-charcoal-muted mt-1 uppercase tracking-wider">This greeting will prefix the customized reservation details call script.</p>
              </div>

              <div className="md:col-span-2 flex space-x-4 pt-6 border-t border-sand-200 mt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAgentModal(false)} 
                  className="flex-1 py-4 font-bold text-charcoal-muted bg-sand-50 hover:bg-sand-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 btn-premium py-4 shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  Create Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Call Detail & Simulation Player Modal */}
      {selectedCall && (
        <AICallModal
          call={selectedCall}
          onClose={() => setSelectedCall(null)}
        />
      )}
    </div>
  );
};

/* Custom Premium Wave Player Modal */
const AICallModal = ({ call, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const utteranceRef = useRef(null);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        window.speechSynthesis.cancel();
      };
    }
  }, []);

  const getOptimalVoice = (lang, voiceType) => {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const targetLang = lang.toLowerCase().replace('_', '-');
    const langFamily = targetLang.split('-')[0];

    // Filter strictly by language or language family first to prevent language mismatch crash
    let matchingLang = voices.filter(v => {
      const vLang = v.lang.toLowerCase().replace('_', '-');
      return vLang.includes(targetLang) || targetLang.includes(vLang) || vLang.startsWith(langFamily + '-');
    });

    // Hindi/Marathi Devanagari fallback cross-matching if one language family is missing
    if (matchingLang.length === 0 && (langFamily === 'mr' || langFamily === 'hi')) {
      const siblingFamily = langFamily === 'mr' ? 'hi' : 'mr';
      matchingLang = voices.filter(v => {
        const vLang = v.lang.toLowerCase().replace('_', '-');
        return vLang.includes(siblingFamily + '-') || vLang.startsWith(siblingFamily + '-');
      });
    }

    if (matchingLang.length === 0) {
      return null;
    }

    const isFemale = (voiceType || '').toLowerCase() === 'female';
    const isMale = (voiceType || '').toLowerCase() === 'male';

    const femaleKeywords = ['zira', 'kalpana', 'samantha', 'hazel', 'susan', 'female', 'aria', 'haruka', 'heera', 'shruti', 'sangeeta', 'ekta', 'madhur'];
    const maleKeywords = ['david', 'hemant', 'mark', 'george', 'male', 'guy', 'ravi', 'stefan', 'dilip', 'ravi', 'hari'];

    let genderFiltered = matchingLang.filter(v => {
      const nameLower = v.name.toLowerCase();
      if (isFemale) {
        return femaleKeywords.some(kw => nameLower.includes(kw)) && !maleKeywords.some(kw => nameLower.includes(kw));
      }
      if (isMale) {
        return maleKeywords.some(kw => nameLower.includes(kw)) && !femaleKeywords.some(kw => nameLower.includes(kw));
      }
      return true;
    });

    if (genderFiltered.length === 0) {
      genderFiltered = matchingLang;
    }

    const qualityKeywords = ['natural', 'online', 'neural', 'google', 'premium', 'high'];
    genderFiltered.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aScore = qualityKeywords.reduce((score, kw) => score + (aName.includes(kw) ? 1 : 0), 0);
      const bScore = qualityKeywords.reduce((score, kw) => score + (bName.includes(kw) ? 1 : 0), 0);
      return bScore - aScore;
    });

    return genderFiltered[0] || null;
  };

  const handlePlayPause = () => {
    if (!('speechSynthesis' in window)) {
      setIsPlaying(!isPlaying);
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        window.speechSynthesis.resume();
        window.speechSynthesis.cancel();
        
        // Micro-timeout to clear speech queue in Chromium engine
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(call.script);
          
          // Auto-detect language from script text
          const text = (call.script || '').toLowerCase();
          let lang = 'en-IN';
          if (text.includes('bolat aahe') || text.includes('sathi') || text.includes('tumche') || text.includes('tumcha') || text.includes('jhali')) {
            lang = 'mr-IN';
          } else if (text.includes('bol raha') || text.includes('aapki') || text.includes('aapka') || text.includes('liye confirm') || text.includes('bol rahi')) {
            lang = 'hi-IN';
          }
          utterance.lang = lang;
          
          // Match voice by language and agent gender
          let selectedVoice = null;
          if (call.external_voice_name) {
            const voices = window.speechSynthesis.getVoices();
            selectedVoice = voices.find(v => v.name === call.external_voice_name);
          }
          
          if (!selectedVoice) {
            const voiceGender = call.voice_type || ((call.agent_name || '').toLowerCase().includes('sneha') ? 'Female' : 'Male');
            selectedVoice = getOptimalVoice(lang, voiceGender);
          }

          if (selectedVoice) {
            utterance.voice = selectedVoice;
            utterance.lang = selectedVoice.lang;
          }

          utterance.onend = () => {
            setIsPlaying(false);
            setProgress(0);
          };

          utterance.onerror = (e) => {
            console.error('Speech Synthesis Error:', e);
            setIsPlaying(false);
            setProgress(0);
          };

          // Cache the utterance reference globally and on React ref to prevent garbage collection silent failure
          utteranceRef.current = utterance;
          window._currentUtterance = utterance;

          window.speechSynthesis.speak(utterance);
        }, 100);
      }
    }
  };  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((p) => {
          if (p >= call.duration_seconds) {
            setIsPlaying(false);
            return 0;
          }
          return p + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, call.duration_seconds]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-md transition-all duration-300">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-sand-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-charcoal to-neutral-800 p-6 text-white flex justify-between items-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-terracotta">Voice AI Concierge</span>
            <h3 className="text-xl font-black tracking-tight">{call.agent_name}</h3>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all font-bold"
          >
            ✕
          </button>
        </div>

        {/* Call Info details */}
        <div className="p-6 bg-sand-50/50 border-b border-sand-200 text-xs font-semibold text-charcoal-muted grid grid-cols-2 gap-4">
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-charcoal-light">Recipient</span>
            <span className="text-charcoal text-sm font-bold">{call.recipient_name} ({call.role})</span>
          </div>
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-charcoal-light">Phone number</span>
            <span className="text-charcoal text-sm font-bold">{call.phone}</span>
          </div>
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-charcoal-light">Duration</span>
            <span className="text-charcoal text-sm font-bold">{call.duration_seconds} seconds</span>
          </div>
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-charcoal-light">Status</span>
            <span className="inline-flex items-center text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md text-[10px] font-black uppercase mt-1">
              ● Connected
            </span>
          </div>
        </div>

        {/* Audio Visualizer & Player */}
        <div className="p-6 border-b border-sand-100 flex flex-col items-center justify-center bg-sand-50/30">
          {/* Wave visualizer */}
          <div className="flex items-end justify-center gap-1.5 h-16 mb-6 w-full px-12">
            {Array.from({ length: 28 }).map((_, i) => {
              const height = isPlaying 
                ? `${15 + Math.sin(progress * 1.5 + i) * 35 + Math.random() * 20}%`
                : '10%';
              return (
                <div 
                  key={i} 
                  className={`w-1 rounded-full transition-all duration-300 ${
                    isPlaying ? 'bg-terracotta' : 'bg-sand-300'
                  }`}
                  style={{ height, minHeight: '4px' }}
                />
              );
            })}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between w-full gap-4">
            <span className="text-xs font-bold font-mono text-charcoal-muted">{formatTime(progress)}</span>
            <button
              onClick={handlePlayPause}
              className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md flex items-center gap-2 ${
                isPlaying 
                  ? 'bg-charcoal hover:bg-neutral-800 text-white' 
                  : 'bg-terracotta hover:bg-terracotta-dark text-white'
              }`}
            >
              {isPlaying ? (
                <>
                  <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                  Pause Simulation
                </>
              ) : (
                <>
                  ▶ Play voice call
                </>
              )}
            </button>
            <span className="text-xs font-bold font-mono text-charcoal-muted">{formatTime(call.duration_seconds)}</span>
          </div>
        </div>

        {/* Transcription bubble */}
        <div className="p-6 overflow-y-auto flex-1 bg-white min-h-[160px] max-h-[300px]">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-charcoal-muted mb-3 flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5" /> Call Transcription Script
          </h4>
          <div className="bg-sand-50 p-4 rounded-2xl border border-sand-200/50 text-sm font-medium text-charcoal leading-relaxed relative">
            <div className="absolute top-3 left-4 text-xs text-terracotta font-black uppercase tracking-wider text-[9px] mb-1 font-sans">
              {call.agent_name}
            </div>
            <p className="mt-4 italic">
              "{call.script}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AICallsManagement;
