import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Mail, Lock, Phone, User, MapPin, ArrowLeft, ShieldCheck, Star } from 'lucide-react';
import { authAPI, apiClient } from '../services/api';
import LegalLinks from '../components/LegalLinks';
import SEO from '../components/SEO';
import { INDIAN_CITIES } from '../lib/indianCities';

const AuthPage = ({ isAdminLogin = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, adminLogin, register, logout } = useAuth();
  const forcedLogoutHandled = useRef(false);
  const cityFieldRef = useRef(null);
  const searchParams = new URLSearchParams(window.location.search);
  const forceLogin = searchParams.get('force_login') === '1';
  const requestedNext = searchParams.get('next') || '';
  const initialRole = searchParams.get('role') === 'host' ? 'host' : 'guest';
  const [isLogin, setIsLogin] = useState(location.pathname !== '/register');
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
    role: initialRole,
    lg_code: '',
    employee_code: '',
    terms_accepted: false
  });
  
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [otp, setOtp] = useState('');
  const [availableBrokers, setAvailableBrokers] = useState([]);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);

  useEffect(() => {
    if (forceLogin && !forcedLogoutHandled.current) {
      forcedLogoutHandled.current = true;
      logout();
    }
  }, [forceLogin, logout]);

  useEffect(() => {
    setIsLogin(location.pathname !== '/register');
  }, [location.pathname]);

  useEffect(() => {
    const fetchBrokersAndEmployees = async () => {
      try {
        const response = await apiClient.get('/auth/public/brokers-and-employees');
        if (response.data) {
          setAvailableBrokers(response.data.brokers || []);
          setAvailableEmployees(response.data.employees || []);
        }
      } catch (err) {
        console.error('Failed to fetch brokers and employees:', err);
      }
    };
    fetchBrokersAndEmployees();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cityFieldRef.current && !cityFieldRef.current.contains(event.target)) {
        setCityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCities = useMemo(() => {
    const query = registerData.city.trim().toLowerCase();
    if (!query) return INDIAN_CITIES;
    return INDIAN_CITIES.filter((city) => city.toLowerCase().includes(query));
  }, [registerData.city]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = isAdminLogin
      ? await adminLogin(loginData.email, loginData.password)
      : await login(loginData.email, loginData.password);
    
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
        navigate(requestedNext.startsWith('/host/') ? requestedNext : '/host/dashboard');
      } else if (userRole === 'broker') {
        navigate('/broker/dashboard');
      } else if (userRole === 'employee') {
        navigate('/employee/dashboard');
      } else {
        navigate(requestedNext.startsWith('/guest/') ? requestedNext : '/guest/browse');
      }
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleGoldenRichSso = () => {
    const backendUrl = (apiClient.defaults.baseURL || '').replace(/\/$/, '');
    window.location.href = `${backendUrl}/api/auth/sso/goldenrich/login`;
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
        setShowOTPVerification(true);
        setSuccess(`OTP sent to ${registerData.phone}.`);
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
    <div className="h-screen bg-stone flex overflow-hidden selection:bg-terracotta selection:text-white">
      <SEO
        title={isAdminLogin ? "Admin Sign In" : (isLogin ? "Sign In" : "Register")}
        robots="noindex,nofollow"
      />
      {/* Left Panel: Visual/Branding (Desktop Only) */}
      <div className="hidden lg:flex lg:w-5/12 relative bg-charcoal overflow-hidden border-r border-gray-100 h-full">
        <div className="absolute inset-0 z-0">
          <img
            src="/videos/login%20image/pexels-veer-patel-2161481449-37547129.jpg"
            alt="Login Background"
            className="w-full h-full object-cover opacity-50 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-charcoal via-charcoal/30 to-transparent"></div>
        </div>

        <div className="relative z-10 w-full p-16 flex flex-col justify-between">
            <div 
               className="flex items-center space-x-3 cursor-pointer group w-fit" 
               onClick={() => navigate('/')}
            >
               <img src="/logo.png" alt="X-Space360 Logo" className="h-10 w-auto object-contain logo-white" />
            </div>

           <div className="animate-slide-up">
              <div className="flex items-center space-x-2 text-terracotta mb-6">
                 {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                 <span className="text-[10px] font-bold tracking-tight tracking-[0.3em] text-white/60 ml-2 uppercase">Elite Network</span>
              </div>
              <h2 className="text-6xl font-bold tracking-tight text-white tracking-tighter leading-none mb-8">
                 Enter the world of <br />
                 <span className="text-terracotta italic font-serif lowercase pr-4">premium</span> hospitality.
              </h2>
              <p className="text-white/60 font-bold text-sm max-w-md leading-relaxed uppercase tracking-widest">
                 Join India's most exclusive network of short-term rental properties and verified hosts.
              </p>
           </div>

           <div className="flex items-center space-x-12">
              <div className="flex flex-col">
                 <span className="text-3xl font-bold tracking-tight text-white tracking-tighter">500+</span>
                 <span className="text-[10px] font-bold tracking-tight text-white/40 uppercase tracking-widest">Properties</span>
              </div>
              <div className="flex flex-col">
                 <span className="text-3xl font-bold tracking-tight text-white tracking-tighter">12K+</span>
                 <span className="text-[10px] font-bold tracking-tight text-white/40 uppercase tracking-widest">Guests</span>
              </div>
              <div className="flex flex-col">
                 <span className="text-3xl font-bold tracking-tight text-white tracking-tighter">98%</span>
                 <span className="text-[10px] font-bold tracking-tight text-white/40 uppercase tracking-widest">Satisfaction</span>
              </div>
           </div>
        </div>
      </div>

      {/* Right Panel: Auth Form */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-6 md:p-14 overflow-y-auto h-full bg-white/50 backdrop-blur-xl">
        <div className="w-full max-w-xl animate-fade-in">
           {/* Logo (Mobile Only) */}
           <div className="lg:hidden text-center mb-10 flex justify-center">
              <img src="/logo.png" alt="X-Space360 Logo" className="h-12 w-auto object-contain hover:opacity-90 transition cursor-pointer" onClick={() => navigate('/')} />
           </div>

           <div className="mb-5 text-center">
              <h3 className="text-4xl font-bold tracking-tight text-charcoal tracking-tighter mb-2 leading-none">
                 {isAdminLogin ? 'Admin Console' : (isLogin ? 'Welcome Back' : 'Create Account')}
              </h3>
              <p className="text-charcoal-muted font-bold text-[10px] uppercase tracking-[0.25em]">
                 {isAdminLogin ? 'Access your administrative command center' : (isLogin ? 'Access your elite dashboard' : 'Join our premium hospitality network')}
              </p>
           </div>

           {/* Auth Card Content */}
           <div className="space-y-5">
              {/* Toggle Switch */}
              {!isAdminLogin && (
                 <div className="flex bg-sand-200 p-1.5 rounded-2xl border border-gray-200 shadow-inner max-w-sm mx-auto">
                    <button
                       onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
                       className={`flex-1 py-4 rounded-xl font-bold tracking-tight text-[10px] tracking-[0.15em] uppercase transition-all duration-500 ${
                          isLogin ? 'bg-white text-terracotta shadow-premium scale-100' : 'text-charcoal-muted hover:text-charcoal scale-95 opacity-60'
                       }`}
                    >
                       Sign In
                    </button>
                    <button
                       onClick={() => { setIsLogin(false); setError(''); setSuccess(''); setShowOTPVerification(false); }}
                       className={`flex-1 py-4 rounded-xl font-bold tracking-tight text-[10px] tracking-[0.15em] uppercase transition-all duration-500 ${
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
                    <p className="text-[10px] font-bold tracking-tight text-terracotta uppercase tracking-widest mb-1">Security Alert</p>
                    <p className="text-sm font-bold text-charcoal leading-relaxed">{error}</p>
                 </div>
              )}
              {success && (
                 <div className="bg-sage/10 border-l-4 border-sage-dark p-6 rounded-2xl shadow-sm">
                    <p className="text-[10px] font-bold tracking-tight text-sage-dark uppercase tracking-widest mb-1">System Notification</p>
                    <p className="text-sm font-bold text-charcoal leading-relaxed">{success}</p>
                 </div>
              )}

              {/* Forms */}
              {isLogin ? (
                 <form onSubmit={handleLogin} className="space-y-8 animate-slide-up">
                    <div className="space-y-3">
                       <label className="block text-[11px] font-bold tracking-tight text-charcoal tracking-[0.15em] uppercase ml-1">Email Address</label>
                       <div className="relative group">
                          <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-sand-400 group-focus-within:text-terracotta transition-all z-10" />
                          <input
                             id="login-email"
                             name="email"
                             type="email"
                             autoComplete="email"
                             value={loginData.email}
                             onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                             className="w-full pl-16 pr-8 py-5 bg-white border-2 border-gray-100 rounded-2xl focus:border-terracotta focus:ring-8 focus:ring-terracotta/5 transition-all outline-none text-charcoal font-bold text-base shadow-sm placeholder:text-sand-300 placeholder:font-semibold"
                             placeholder="email@example.com"
                             required
                          />
                       </div>
                    </div>
                    
                    <div className="space-y-3">
                       <div className="flex justify-between items-center px-1">
                          <label className="block text-[11px] font-bold tracking-tight text-charcoal tracking-[0.15em] uppercase">Password</label>
                          <button
                             type="button"
                             onClick={() => navigate(`/forgot-password?login=${encodeURIComponent(isAdminLogin ? '/admin/login' : '/login')}`)}
                             className="text-[10px] font-bold tracking-tight text-terracotta uppercase tracking-wider hover:underline underline-offset-4"
                          >
                             Forgot Password?
                          </button>
                       </div>
                       <div className="relative group">
                          <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-sand-400 group-focus-within:text-terracotta transition-all z-10" />
                          <input
                             id="login-password"
                             name="password"
                             type="password"
                             autoComplete="current-password"
                             value={loginData.password}
                             onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                             className="w-full pl-16 pr-8 py-5 bg-white border-2 border-gray-100 rounded-2xl focus:border-terracotta focus:ring-8 focus:ring-terracotta/5 transition-all outline-none text-charcoal font-bold text-base shadow-sm placeholder:text-sand-300 placeholder:font-semibold"
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
                       {loading ? 'SIGNING IN...' : 'SIGN IN'}
                    </button>

                 </form>
              ) : (
                 <div className="space-y-4 animate-slide-up">
                    {!showOTPVerification ? (
                       <div className="space-y-4">
                          <div className="space-y-3 pt-1 text-center">
                             <label className="block text-[11px] font-bold tracking-tight text-charcoal-muted uppercase tracking-[0.2em]">Select Role</label>
                             <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                                {['guest', 'host'].map(role => (
                                   <button
                                      key={role}
                                      type="button"
                                      onClick={() => {
                                         setRegisterData({ ...registerData, role });
                                      }}
                                      className={`py-3 rounded-2xl border-2 font-bold tracking-tight text-[11px] uppercase tracking-widest transition-all duration-500 ${
                                         registerData.role === role 
                                         ? 'border-terracotta bg-terracotta text-white shadow-elevated scale-[1.02]' 
                                         : 'border-gray-100 bg-white text-charcoal-muted hover:border-terracotta'
                                      }`}
                                   >
                                      {role === 'guest' ? 'Guest' : 'Host'}
                                   </button>
                                ))}
                             </div>
                          </div>

                          <div className="space-y-2">
                             <label className="block text-[11px] font-bold tracking-tight text-charcoal tracking-[0.15em] uppercase ml-1">Full Name</label>
                             <input
                                id="register-full-name"
                                name="full_name"
                                type="text"
                                autoComplete="name"
                                value={registerData.full_name}
                                onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
                                className="w-full px-6 py-3.5 bg-white border-2 border-gray-100 rounded-2xl focus:border-terracotta focus:ring-8 focus:ring-terracotta/5 transition-all outline-none text-charcoal font-bold text-base shadow-sm"
                                placeholder="Your full name"
                                required
                             />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                             <div className="space-y-2">
                                <label className="block text-[11px] font-bold tracking-tight text-charcoal tracking-[0.15em] uppercase ml-1">Email Address</label>
                                <input
                                   id="register-email"
                                   name="email"
                                   type="email"
                                   autoComplete="email"
                                   value={registerData.email}
                                   onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                   className="w-full px-6 py-3.5 bg-white border-2 border-gray-100 rounded-2xl focus:border-terracotta focus:ring-8 focus:ring-terracotta/5 transition-all outline-none text-charcoal font-bold text-base shadow-sm"
                                   placeholder="email@example.com"
                                   required
                                />
                             </div>
                             <div className="space-y-2">
                                <label className="block text-[11px] font-bold tracking-tight text-charcoal tracking-[0.15em] uppercase ml-1">Phone Number</label>
                                <input
                                   id="register-phone"
                                   name="phone"
                                   type="tel"
                                   autoComplete="tel"
                                   value={registerData.phone}
                                   onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                                   className="w-full px-6 py-3.5 bg-white border-2 border-gray-100 rounded-2xl focus:border-terracotta focus:ring-8 focus:ring-terracotta/5 transition-all outline-none text-charcoal font-bold text-base shadow-sm"
                                   placeholder="+91..."
                                   required
                                />
                             </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                             <div className="space-y-2">
                                <label className="block text-[11px] font-bold tracking-tight text-charcoal tracking-[0.15em] uppercase ml-1">Password</label>
                                <input
                                   id="register-password"
                                   name="password"
                                   type="password"
                                   autoComplete="new-password"
                                   value={registerData.password}
                                   onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                   className="w-full px-6 py-3.5 bg-white border-2 border-gray-100 rounded-2xl focus:border-terracotta focus:ring-8 focus:ring-terracotta/5 transition-all outline-none text-charcoal font-bold text-base shadow-sm"
                                   placeholder="••••••••"
                                   required
                                />
                             </div>
                             <div
                                ref={cityFieldRef}
                                className="space-y-2 relative"
                                onMouseEnter={() => setCityDropdownOpen(true)}
                             >
                                <label className="block text-[11px] font-bold tracking-tight text-charcoal tracking-[0.15em] uppercase ml-1">City</label>
                                <input
                                   id="register-city"
                                   name="city"
                                   type="text"
                                   autoComplete="address-level2"
                                   value={registerData.city}
                                   onFocus={() => setCityDropdownOpen(true)}
                                   onClick={() => setCityDropdownOpen(true)}
                                   onKeyDown={(e) => {
                                      if (e.key === 'Escape') setCityDropdownOpen(false);
                                   }}
                                   onChange={(e) => {
                                      setRegisterData({ ...registerData, city: e.target.value });
                                      setCityDropdownOpen(true);
                                   }}
                                   className="w-full px-6 py-3.5 bg-white border-2 border-gray-100 rounded-2xl focus:border-terracotta focus:ring-8 focus:ring-terracotta/5 transition-all outline-none text-charcoal font-bold text-base shadow-sm"
                                   placeholder="Search or select city"
                                   required
                                />
                                {cityDropdownOpen && (
                                   <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-elevated">
                                      <div className="max-h-64 overflow-y-auto py-2">
                                         {filteredCities.length > 0 ? (
                                            filteredCities.map((city) => (
                                               <button
                                                  key={city}
                                                  type="button"
                                                  onMouseDown={(e) => e.preventDefault()}
                                                  onClick={() => {
                                                     setRegisterData({ ...registerData, city });
                                                     setCityDropdownOpen(false);
                                                  }}
                                                  className={`w-full px-5 py-3 text-left text-sm font-bold transition hover:bg-terracotta/10 hover:text-terracotta ${
                                                     registerData.city === city ? 'bg-terracotta/10 text-terracotta' : 'text-charcoal'
                                                  }`}
                                               >
                                                  {city}
                                               </button>
                                            ))
                                         ) : (
                                            <div className="px-5 py-4 text-sm font-semibold text-charcoal-muted">
                                               No city found
                                            </div>
                                         )}
                                      </div>
                                   </div>
                                )}
                             </div>
                          </div>

                          {registerData.role === 'host' && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
                                <div className="space-y-2">
                                   <label className="block text-[11px] font-bold tracking-tight text-charcoal tracking-[0.15em] uppercase ml-1">Broker Code</label>
                                   <select
                                      value={registerData.lg_code}
                                      onChange={(e) => setRegisterData({ ...registerData, lg_code: e.target.value })}
                                      className="w-full px-6 py-3.5 bg-white border-2 border-gray-100 rounded-2xl focus:border-terracotta focus:ring-8 focus:ring-terracotta/5 transition-all outline-none text-charcoal font-bold text-base shadow-sm"
                                   >
                                      <option value="">-- Select Broker Code --</option>
                                      {availableBrokers.map(b => (
                                         <option key={b.user_id} value={b.lg_code}>
                                            {b.full_name} ({b.lg_code})
                                         </option>
                                      ))}
                                   </select>
                                </div>
                                <div className="space-y-2">
                                   <label className="block text-[11px] font-bold tracking-tight text-charcoal tracking-[0.15em] uppercase ml-1">Employee Code</label>
                                   <select
                                      value={registerData.employee_code}
                                      onChange={(e) => setRegisterData({ ...registerData, employee_code: e.target.value })}
                                      className="w-full px-6 py-3.5 bg-white border-2 border-gray-100 rounded-2xl focus:border-terracotta focus:ring-8 focus:ring-terracotta/5 transition-all outline-none text-charcoal font-bold text-base shadow-sm"
                                   >
                                      <option value="">-- Select Employee Code --</option>
                                      {availableEmployees.map(emp => (
                                         <option key={emp.user_id} value={emp.employee_code}>
                                            {emp.full_name} ({emp.employee_code})
                                         </option>
                                      ))}
                                   </select>
                                </div>
                             </div>
                          )}
                          
                          <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 group cursor-pointer">
                             <input
                                id="register-terms"
                                name="terms_accepted"
                                type="checkbox"
                                checked={registerData.terms_accepted}
                                onChange={(e) => setRegisterData({ ...registerData, terms_accepted: e.target.checked })}
                                className="mt-1 w-5 h-5 text-terracotta rounded-lg border-gray-200 focus:ring-terracotta cursor-pointer flex-shrink-0"
                                required
                             />
                             <label className="text-xs text-charcoal-muted font-semibold leading-relaxed cursor-pointer">
                                I accept the <LegalLinks className="inline" context={registerData.role === 'host' ? 'host_registration' : 'guest_registration'} />.
                             </label>
                          </div>
                          
                          <button
                             type="button"
                             onClick={sendOTP}
                             disabled={loading}
                             className="btn-premium w-full py-3.5 text-base tracking-widest shadow-elevated rounded-2xl"
                          >
                             {loading ? 'VALIDATING...' : 'CONTINUE'}
                          </button>
                       </div>
                    ) : (
                       <div className="space-y-9 text-center animate-fade-in">
                          <div className="flex flex-col items-center">
                             <div className="w-22 h-22 bg-terracotta/10 rounded-2xl flex items-center justify-center mb-6 border-4 border-terracotta/20 shadow-premium">
                                <ShieldCheck className="w-11 h-11 text-terracotta" />
                             </div>
                             <h3 className="text-4xl font-bold tracking-tight text-charcoal tracking-tighter">Verification</h3>
                          </div>

                          <div className="flex justify-center">
                             <input
                                id="otp-code"
                                name="otp"
                                type="text"
                                autoComplete="one-time-code"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full max-w-[320px] text-center text-4xl font-bold tracking-tight tracking-[0.6em] py-7 bg-white rounded-2xl border-2 border-gray-100 focus:border-terracotta focus:ring-12 focus:ring-terracotta/5 transition-all outline-none text-charcoal shadow-inner"
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
                                className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-[0.3em] hover:text-terracotta transition-colors block mx-auto underline-offset-4 hover:underline"
                              >
                                REQUEST NEW OTP
                              </button>
                          </div>
                       </div>
                    )}
                 </div>
              )}
           </div>

           <div className="text-center mt-6 pt-5 border-t border-gray-100">
              <button
                 onClick={() => navigate('/')}
                 className="group inline-flex items-center space-x-4 text-charcoal-muted hover:text-terracotta transition-colors font-bold tracking-tight text-[10px] uppercase tracking-[0.4em]"
              >
                 <ArrowLeft className="w-5 h-5 group-hover:-translate-x-2 transition-transform duration-500" />
                 <span>Back to Home</span>
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
