import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Mail, Lock, Phone, User, MapPin, ArrowLeft, ShieldCheck, Star } from 'lucide-react';
import { authAPI } from '../services/api';

const AuthPage = ({ isAdminLogin = false }) => {
  const navigate = useNavigate();
  const { login, register, logout } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  
  const [registerData, setRegisterData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    city: '',
    role: 'guest',
    lg_code: '',
    terms_accepted: false
  });
  
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [otp, setOtp] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await login(loginData.email, loginData.password);
    
    if (result.success) {
      const userRole = result.user.role;
      if (isAdminLogin && userRole !== 'admin') {
        logout();
        setError('Access denied. Only administrators are allowed.');
        setLoading(false);
        return;
      }
      if (userRole === 'admin') {
        navigate('/admin/dashboard');
      } else if (userRole === 'host') {
        navigate('/host/dashboard');
      } else if (userRole === 'broker') {
        navigate('/broker/dashboard');
      } else if (userRole === 'employee') {
        navigate('/employee/dashboard');
      } else {
        navigate('/guest/browse');
      }
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const sendOTP = async () => {
    if (!registerData.phone) {
      setError('Please enter phone number');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await authAPI.sendOTP(registerData.phone, 'registration');
      if (response.data) {
        setGeneratedOTP(response.data.otp || '');
        setShowOTPVerification(true);
        setSuccess(
          response.data.otp
            ? `OTP sent to ${registerData.phone}. OTP: ${response.data.otp}`
            : `OTP sent to ${registerData.phone}.`
        );
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(detail || 'Failed to send OTP. Please try again in a moment.');
    }

    setLoading(false);
  };

  const verifyOTP = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.verifyOTP(registerData.phone, otp, 'registration');
      if (response.data.verified) {
        setSuccess('Phone verified! Completing registration...');
        handleRegistration();
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(detail || 'Invalid OTP. Please try again.');
      setLoading(false);
    }
  };

  const handleRegistration = async () => {
    const result = await register(registerData);
    
    if (result.success) {
      const userRole = result.user.role;
      if (userRole === 'host') {
        navigate('/host/dashboard');
      } else if (userRole === 'broker') {
        navigate('/broker/dashboard');
      } else {
        navigate('/guest/browse');
      }
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-sand-50 flex overflow-hidden selection:bg-terracotta selection:text-white font-outfit">
      {/* Left Panel: Visual/Branding (Desktop Only) */}
      <div className="hidden lg:flex lg:w-5/12 relative bg-charcoal overflow-hidden border-r border-sand-200">
        <div className="absolute inset-0 z-0">
           <img 
              src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c" 
              alt="Luxury Architecture" 
              className="w-full h-full object-cover opacity-50 scale-105 animate-slow-zoom"
           />
           <div className="absolute inset-0 bg-gradient-to-tr from-charcoal via-charcoal/30 to-transparent"></div>
        </div>

        <div className="relative z-10 w-full p-16 flex flex-col justify-between">
            <div 
               className="flex items-center space-x-3 cursor-pointer group w-fit" 
               onClick={() => navigate('/')}
            >
               <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="w-12 h-12 object-contain transition-transform duration-500 group-hover:scale-110"
               />
               <h1 className="text-3xl font-black text-white tracking-tighter uppercase whitespace-nowrap">
                  X-Space<span className="text-terracotta">360</span>
               </h1>
            </div>

           <div className="animate-slide-up">
              <div className="flex items-center space-x-2 text-terracotta mb-6">
                 {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                 <span className="text-[10px] font-black tracking-[0.3em] text-white/60 ml-2 uppercase">Elite Network</span>
              </div>
              <h2 className="text-6xl font-black text-white tracking-tighter leading-none mb-8">
                 Enter the world of <br />
                 <span className="text-terracotta italic font-serif lowercase pr-4">premium</span> hospitality.
              </h2>
              <p className="text-white/60 font-bold text-sm max-w-md leading-relaxed uppercase tracking-widest">
                 Join India's most exclusive network of short-term rental properties and verified hosts.
              </p>
           </div>

           <div className="flex items-center space-x-12">
              <div className="flex flex-col">
                 <span className="text-3xl font-black text-white tracking-tighter">500+</span>
                 <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Properties</span>
              </div>
              <div className="flex flex-col">
                 <span className="text-3xl font-black text-white tracking-tighter">12K+</span>
                 <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Guests</span>
              </div>
              <div className="flex flex-col">
                 <span className="text-3xl font-black text-white tracking-tighter">98%</span>
                 <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Satisfaction</span>
              </div>
           </div>
        </div>
      </div>

      {/* Right Panel: Auth Form */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-8 md:p-24 overflow-y-auto bg-white/50 backdrop-blur-xl">
        <div className="w-full max-w-xl animate-fade-in">
           {/* Logo (Mobile Only) */}
           <div className="lg:hidden text-center mb-10">
              <img 
                 src="/logo.png" 
                 alt="Logo" 
                 className="w-16 h-16 object-contain mx-auto mb-3 transition-transform duration-500 hover:scale-110"
              />
              <h1 className="text-xl font-black text-charcoal tracking-tighter uppercase whitespace-nowrap">
                 X-Space<span className="text-terracotta">360</span>
              </h1>
           </div>

           <div className="mb-10 text-center lg:text-left">
              <h3 className="text-5xl font-black text-charcoal tracking-tighter mb-3 leading-none">
                 {isAdminLogin ? 'Admin Console' : (isLogin ? 'Welcome Back' : 'Create Account')}
              </h3>
              <p className="text-charcoal-muted font-bold text-[10px] uppercase tracking-[0.25em]">
                 {isAdminLogin ? 'Access your administrative command center' : (isLogin ? 'Access your elite dashboard' : 'Join our premium hospitality network')}
              </p>
           </div>

           {/* Auth Card Content */}
           <div className="space-y-10">
              {/* Toggle Switch */}
              {!isAdminLogin && (
                 <div className="flex bg-sand-200 p-1.5 rounded-2xl border border-sand-300 shadow-inner max-w-sm mx-auto lg:mx-0">
                    <button
                       onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
                       className={`flex-1 py-4 rounded-xl font-black text-[10px] tracking-[0.15em] uppercase transition-all duration-500 ${
                          isLogin ? 'bg-white text-terracotta shadow-premium scale-100' : 'text-charcoal-muted hover:text-charcoal scale-95 opacity-60'
                       }`}
                    >
                       Sign In
                    </button>
                    <button
                       onClick={() => { setIsLogin(false); setError(''); setSuccess(''); setShowOTPVerification(false); }}
                       className={`flex-1 py-4 rounded-xl font-black text-[10px] tracking-[0.15em] uppercase transition-all duration-500 ${
                          !isLogin ? 'bg-white text-terracotta shadow-premium scale-100' : 'text-charcoal-muted hover:text-charcoal scale-95 opacity-60'
                       }`}
                    >
                       Register
                    </button>
                 </div>
              )}

              {/* Status Messages */}
              {error && (
                 <div className="bg-red-50 border-l-4 border-terracotta p-6 rounded-2xl animate-shake shadow-sm">
                    <p className="text-[10px] font-black text-terracotta uppercase tracking-widest mb-1">Security Alert</p>
                    <p className="text-sm font-bold text-charcoal leading-relaxed">{error}</p>
                 </div>
              )}
              {success && (
                 <div className="bg-sage/10 border-l-4 border-sage-dark p-6 rounded-2xl shadow-sm">
                    <p className="text-[10px] font-black text-sage-dark uppercase tracking-widest mb-1">System Notification</p>
                    <p className="text-sm font-bold text-charcoal leading-relaxed">{success}</p>
                 </div>
              )}

              {/* Forms */}
              {isLogin ? (
                 <form onSubmit={handleLogin} className="space-y-8 animate-slide-up">
                    <div className="space-y-3">
                       <label className="block text-[11px] font-black text-charcoal tracking-[0.15em] uppercase ml-1">Identity (Email Address)</label>
                       <div className="relative group">
                          <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-sand-400 group-focus-within:text-terracotta transition-all z-10" />
                          <input
                             type="email"
                             value={loginData.email}
                             onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                             className="w-full pl-16 pr-8 py-5 bg-white border-2 border-sand-200 rounded-2xl focus:border-terracotta focus:ring-8 focus:ring-terracotta/5 transition-all outline-none text-charcoal font-bold text-base shadow-sm placeholder:text-sand-300 placeholder:font-semibold"
                             placeholder="name@exclusive.com"
                             required
                          />
                       </div>
                    </div>
                    
                    <div className="space-y-3">
                       <div className="flex justify-between items-center px-1">
                          <label className="block text-[11px] font-black text-charcoal tracking-[0.15em] uppercase">Security Access</label>
                          <button type="button" className="text-[10px] font-black text-terracotta uppercase tracking-wider hover:underline underline-offset-4">Forgot Access?</button>
                       </div>
                       <div className="relative group">
                          <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-sand-400 group-focus-within:text-terracotta transition-all z-10" />
                          <input
                             type="password"
                             value={loginData.password}
                             onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                             className="w-full pl-16 pr-8 py-5 bg-white border-2 border-sand-200 rounded-2xl focus:border-terracotta focus:ring-8 focus:ring-terracotta/5 transition-all outline-none text-charcoal font-bold text-base shadow-sm placeholder:text-sand-300 placeholder:font-semibold"
                             placeholder="••••••••"
                             required
                          />
                       </div>
                    </div>
                    
                    <button
                       type="submit"
                       disabled={loading}
                       className="btn-premium w-full py-5 text-base tracking-widest shadow-elevated rounded-2xl"
                    >
                       {loading ? 'CALIBRATING ACCESS...' : 'SIGN IN'}
                    </button>
                 </form>
              ) : (
                 <div className="space-y-8 animate-slide-up">
                    {!showOTPVerification ? (
                       <div className="space-y-8">
                          <div className="space-y-3">
                             <label className="block text-[11px] font-black text-charcoal tracking-[0.15em] uppercase ml-1">Full Legal Name</label>
                             <input
                                type="text"
                                value={registerData.full_name}
                                onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
                                className="w-full px-8 py-5 bg-white border-2 border-sand-200 rounded-2xl focus:border-terracotta focus:ring-8 focus:ring-terracotta/5 transition-all outline-none text-charcoal font-bold text-base shadow-sm"
                                placeholder="Your full name"
                                required
                             />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-3">
                                <label className="block text-[11px] font-black text-charcoal tracking-[0.15em] uppercase ml-1">Work Email</label>
                                <input
                                   type="email"
                                   value={registerData.email}
                                   onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                   className="w-full px-8 py-5 bg-white border-2 border-sand-200 rounded-2xl focus:border-terracotta focus:ring-8 focus:ring-terracotta/5 transition-all outline-none text-charcoal font-bold text-base shadow-sm"
                                   placeholder="email@work.com"
                                   required
                                />
                             </div>
                             <div className="space-y-3">
                                <label className="block text-[11px] font-black text-charcoal tracking-[0.15em] uppercase ml-1">Phone Number</label>
                                <input
                                   type="tel"
                                   value={registerData.phone}
                                   onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                                   className="w-full px-8 py-5 bg-white border-2 border-sand-200 rounded-2xl focus:border-terracotta focus:ring-8 focus:ring-terracotta/5 transition-all outline-none text-charcoal font-bold text-base shadow-sm"
                                   placeholder="+91..."
                                   required
                                />
                             </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-3">
                                <label className="block text-[11px] font-black text-charcoal tracking-[0.15em] uppercase ml-1">Set Password</label>
                                <input
                                   type="password"
                                   value={registerData.password}
                                   onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                   className="w-full px-8 py-5 bg-white border-2 border-sand-200 rounded-2xl focus:border-terracotta focus:ring-8 focus:ring-terracotta/5 transition-all outline-none text-charcoal font-bold text-base shadow-sm"
                                   placeholder="••••••••"
                                   required
                                />
                             </div>
                             <div className="space-y-3">
                                <label className="block text-[11px] font-black text-charcoal tracking-[0.15em] uppercase ml-1">City</label>
                                <input
                                   type="text"
                                   value={registerData.city}
                                   onChange={(e) => setRegisterData({ ...registerData, city: e.target.value })}
                                   className="w-full px-8 py-5 bg-white border-2 border-sand-200 rounded-2xl focus:border-terracotta focus:ring-8 focus:ring-terracotta/5 transition-all outline-none text-charcoal font-bold text-base shadow-sm"
                                   placeholder="Your City"
                                />
                             </div>
                          </div>
                          
                          <div className="space-y-6 pt-4 text-center">
                             <label className="block text-[11px] font-black text-charcoal-muted uppercase tracking-[0.2em]">Select Professional Role</label>
                             <div className="grid grid-cols-2 gap-6 max-w-sm mx-auto">
                                {['guest', 'host'].map(role => (
                                   <button
                                      key={role}
                                      type="button"
                                      onClick={() => setRegisterData({ ...registerData, role })}
                                      className={`py-4 rounded-2xl border-2 font-black text-[11px] uppercase tracking-widest transition-all duration-500 ${
                                         registerData.role === role 
                                         ? 'border-terracotta bg-terracotta text-white shadow-elevated scale-[1.02]' 
                                         : 'border-sand-200 bg-white text-charcoal-muted hover:border-terracotta'
                                      }`}
                                   >
                                      {role === 'guest' ? 'Explorer' : 'Owner'}
                                   </button>
                                ))}
                             </div>
                          </div>
                          
                          <div className="flex items-start space-x-4 p-6 bg-sand-100 rounded-2xl border border-sand-200 group cursor-pointer">
                             <input
                                type="checkbox"
                                checked={registerData.terms_accepted}
                                onChange={(e) => setRegisterData({ ...registerData, terms_accepted: e.target.checked })}
                                className="mt-1 w-6 h-6 text-terracotta rounded-lg border-sand-300 focus:ring-terracotta cursor-pointer"
                                required
                             />
                             <label className="text-[10px] text-charcoal-muted font-black leading-relaxed uppercase tracking-widest cursor-pointer">
                                I accept the <span className="text-terracotta hover:underline">Membership Terms</span> and <span className="text-terracotta hover:underline">Privacy Protocols</span>.
                             </label>
                          </div>
                          
                          <button
                             type="button"
                             onClick={sendOTP}
                             disabled={loading}
                             className="btn-premium w-full py-5 text-base tracking-widest shadow-elevated rounded-2xl"
                          >
                             {loading ? 'VALIDATING...' : 'CONTINUE'}
                          </button>
                       </div>
                    ) : (
                       <div className="space-y-12 text-center animate-fade-in">
                          <div className="flex flex-col items-center">
                             <div className="w-24 h-24 bg-terracotta/10 rounded-[2.5rem] flex items-center justify-center mb-8 border-4 border-terracotta/20 shadow-premium">
                                <ShieldCheck className="w-12 h-12 text-terracotta" />
                             </div>
                             <h3 className="text-4xl font-black text-charcoal tracking-tighter mb-3">Verification</h3>
                             <p className="text-[11px] font-black text-charcoal-muted uppercase tracking-[0.2em] max-w-sm leading-loose">
                                dispatched a unique key to <span className="text-charcoal underline decoration-terracotta decoration-2 underline-offset-4">{registerData.phone}</span>.
                             </p>
                          </div>

                          <div className="flex justify-center">
                             <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full max-w-[320px] text-center text-4xl font-black tracking-[0.6em] py-8 bg-white rounded-[2rem] border-2 border-sand-200 focus:border-terracotta focus:ring-12 focus:ring-terracotta/5 transition-all outline-none text-charcoal shadow-inner"
                                placeholder="000000"
                                maxLength={6}
                             />
                          </div>
                          
                          <div className="space-y-6 pt-4">
                             <button
                                onClick={verifyOTP}
                                disabled={loading}
                                className="btn-premium w-full py-5 text-base tracking-widest shadow-elevated rounded-2xl"
                             >
                                {loading ? 'AUTHENTICATING...' : 'SUBMIT'}
                             </button>
                             
                             <button
                                onClick={sendOTP}
                                disabled={loading}
                                className="text-[10px] font-black text-charcoal-muted uppercase tracking-[0.3em] hover:text-terracotta transition-colors block mx-auto underline-offset-4 hover:underline"
                             >
                                Request New Key
                             </button>
                          </div>
                       </div>
                    )}
                 </div>
              )}
           </div>

           <div className="text-center mt-20 pt-10 border-t border-sand-200">
              <button
                 onClick={() => navigate('/')}
                 className="group inline-flex items-center space-x-4 text-charcoal-muted hover:text-terracotta transition-colors font-black text-[10px] uppercase tracking-[0.4em]"
              >
                 <ArrowLeft className="w-5 h-5 group-hover:-translate-x-2 transition-transform duration-500" />
                 <span>Back to discovery portal</span>
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
