import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Mail, Lock, Phone, User, MapPin, ArrowLeft, ShieldCheck, Star, Eye, EyeOff, X } from 'lucide-react';
import { authAPI, apiClient } from '../services/api';
import LegalLinks from '../components/LegalLinks';
import SEO from '../components/SEO';
import { INDIAN_CITIES } from '../lib/indianCities';

const OTP_VALIDITY_SECONDS = 120;

const AuthPage = ({ isAdminLogin = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, adminLogin, register, logout } = useAuth();
  const forcedLogoutHandled = useRef(false);
  const cityFieldRef = useRef(null);
  const otpTimerRef = useRef(null);
  const otpInputRefs = useRef([]);
  const searchParams = new URLSearchParams(window.location.search);
  const forceLogin = searchParams.get('force_login') === '1';
  const requestedNext = searchParams.get('next') || '';
  const initialRole = searchParams.get('role') === 'host' ? 'host' : 'guest';
  const [isLogin, setIsLogin] = useState(location.pathname !== '/register');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  
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
  const [otpSecondsRemaining, setOtpSecondsRemaining] = useState(0);
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
    return () => {
      if (otpTimerRef.current) {
        clearInterval(otpTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ssoError = params.get('sso_error');
    if (!ssoError) {
      return;
    }
    const messages = {
      invalid_state: 'GRP SSO session expired or was opened from an old tab. Please click Login with GRP again.',
      missing_code: 'GRP SSO did not return an authorization code. Please try again.',
      sso_not_configured: 'GRP SSO is not configured on this server.',
      sso_callback_failed: 'GRP SSO could not be completed. Please try again.',
      grp_authorize_loop: 'GRP authorize page redirected back to X-Space360 before completing login. Please ask GRP team to fix their OAuth authorize endpoint.',
    };
    setIsLogin(true);
    setError(messages[ssoError] || `GRP SSO failed: ${ssoError}`);
  }, [location.search]);

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

  const otpTimerLabel = useMemo(() => {
    const minutes = String(Math.floor(otpSecondsRemaining / 60)).padStart(2, '0');
    const seconds = String(otpSecondsRemaining % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [otpSecondsRemaining]);

  const otpDigits = useMemo(() => otp.padEnd(6, ' ').slice(0, 6).split('').map((digit) => digit.trim()), [otp]);

  const startOtpTimer = () => {
    if (otpTimerRef.current) {
      clearInterval(otpTimerRef.current);
    }
    setOtpSecondsRemaining(OTP_VALIDITY_SECONDS);
    otpTimerRef.current = setInterval(() => {
      setOtpSecondsRemaining((current) => {
        if (current <= 1) {
          clearInterval(otpTimerRef.current);
          otpTimerRef.current = null;
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  };

  const resetOtpFlow = () => {
    if (otpTimerRef.current) {
      clearInterval(otpTimerRef.current);
      otpTimerRef.current = null;
    }
    setOtp('');
    setOtpSecondsRemaining(0);
    setShowOTPVerification(false);
  };

  const handleOtpBoxChange = (index, value) => {
    const digits = value.replace(/\D/g, '').slice(0, 6 - index);
    const nextOtp = otp.padEnd(6, ' ').slice(0, 6).split('');

    if (!digits) {
      nextOtp[index] = ' ';
      setOtp(nextOtp.join('').slice(0, 6));
      return;
    }

    digits.split('').forEach((digit, offset) => {
      nextOtp[index + offset] = digit;
    });

    setOtp(nextOtp.join('').slice(0, 6));
    const nextFocusIndex = Math.min(index + digits.length, 5);
    otpInputRefs.current[nextFocusIndex]?.focus();
  };

  const handleOtpBoxKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const getPasswordRules = (password) => ({
    'Minimum 8 characters': password.length >= 8,
    'Maximum 32 characters': password.length <= 32,
    'At least 1 uppercase letter (A-Z)': /[A-Z]/.test(password),
    'At least 1 lowercase letter (a-z)': /[a-z]/.test(password),
    'At least 1 number (0-9)': /[0-9]/.test(password),
    'At least 1 special character': /[^A-Za-z0-9\s]/.test(password),
    'No spaces allowed': !/\s/.test(password),
  });

  const getPasswordError = (password) => {
    if (!password) return 'Please enter password';
    const rules = getPasswordRules(password);
    const failedRule = Object.entries(rules).find(([, passed]) => !passed);
    return failedRule ? failedRule[0] : '';
  };

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
    window.location.href = `${backendUrl}/api/auth/sso/goldenrich/login?force=1`;
  };

  const sendOTP = async () => {
    if (!registerData.phone) {
      setError('Please enter phone number');
      return;
    }
    const passwordError = getPasswordError(registerData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await authAPI.sendOTP(registerData.phone, 'registration');
      if (response.data) {
        setOtp('');
        setShowOTPVerification(true);
        setSuccess(`OTP sent to ${registerData.phone}.`);
        startOtpTimer();
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(detail || 'Failed to send OTP. Please try again in a moment.');
    }

    setLoading(false);
  };

  const verifyOTP = async () => {
    const cleanOtp = otp.replace(/\D/g, '');
    if (otpSecondsRemaining === 0) {
      setError('OTP expired. Please request a new OTP.');
      return;
    }
    if (cleanOtp.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await authAPI.verifyOTP(registerData.phone, cleanOtp, 'registration');
      if (response.data.verified) {
        if (otpTimerRef.current) {
          clearInterval(otpTimerRef.current);
          otpTimerRef.current = null;
        }
        setOtpSecondsRemaining(0);
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
        navigate(requestedNext.startsWith('/host/') ? requestedNext : '/host/dashboard');
      } else if (userRole === 'broker') {
        navigate('/broker/dashboard');
      } else {
        navigate(requestedNext || '/guest/browse');
      }
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4 select-none selection:bg-terracotta selection:text-white">
      <SEO
        title={isAdminLogin ? "Admin Sign In" : (isLogin ? "Sign In" : "Register")}
        robots="noindex,nofollow"
      />

      {/* StayVista style Modal Box (Fixed height to prevent page scrolling) */}
      <div className="relative w-full max-w-[980px] bg-white rounded-3xl shadow-2xl flex overflow-hidden border border-gray-150 h-[650px] z-10">
        
        {/* Close Button */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 text-gray-400 hover:text-charcoal p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition z-50 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Visual Card Overlay (45% Width, Hidden on Mobile) */}
        <div className="hidden md:block md:w-[42%] p-3 h-full">
          <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-sm">
            <img
              src="https://images.unsplash.com/photo-1675657144361-98ae33e6b6f9?auto=format&fit=crop&q=80&w=800"
              alt="X-Space360 Villa"
              className="absolute inset-0 w-full h-full object-cover blur-[2.5px] scale-105"
            />
            {/* Linear overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/15 to-black/60 z-10" />
            
            {/* Overlay Text Content */}
            <div className="relative z-20 h-full p-6 flex flex-col justify-between text-white text-center">
              {/* Top White Logo */}
              <div className="flex justify-center">
                <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain logo-white" />
              </div>

              {/* Middle Text and Pill Badge */}
              <div className="mb-6 flex flex-col items-center">
                <h4 className="font-lufga text-white text-2xl md:text-3xl font-extrabold leading-tight mb-2 tracking-tight drop-shadow-sm">
                  Book a Room.<br />Enjoy A Villa Getaway
                </h4>
                <p className="text-white text-xs font-semibold max-w-[220px] mb-4 drop-shadow-sm">
                  Enjoy the luxuries & privacy of a villa with
                </p>
                <div className="border border-dashed border-white/80 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-1.5 text-xs font-bold tracking-wide text-white drop-shadow-sm">
                  Rooms Starting at ₹5,000*
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form Content (58% Width) */}
        <div className="w-full md:w-[58%] p-8 flex flex-col justify-between h-full relative overflow-y-auto no-scrollbar">
          
          {/* Top Header Section */}
          <div className="w-full">
            {/* Mini Logo */}
            <div className="mb-4 flex items-center justify-between pr-10">
              <img src="/logo.png" alt="X-Space360" className="h-8 w-auto object-contain" />
            </div>

            {/* Title / Subtext */}
            <div className="mb-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-charcoal-muted">
                {isAdminLogin ? "Admin Console" : "Login/Signup"}
              </span>
              <h3 className="font-lufga text-2xl font-bold tracking-tight text-charcoal leading-tight">
                {isAdminLogin ? "Admin Sign In" : "Welcome to X-Space360"}
              </h3>
            </div>

            {/* Error/Success Alert Box */}
            {error && (
              <div className="bg-red-50 border-l-3 border-terracotta p-2.5 rounded-lg mb-4 text-xs font-semibold text-charcoal leading-tight animate-shake flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError('')} className="text-terracotta hover:scale-110 ml-2 font-bold">×</button>
              </div>
            )}
            {success && (
              <div className="bg-sage/10 border-l-3 border-sage-dark p-2.5 rounded-lg mb-4 text-xs font-semibold text-charcoal leading-tight flex items-center justify-between">
                <span>{success}</span>
                <button onClick={() => setSuccess('')} className="text-sage-dark hover:scale-110 ml-2 font-bold">×</button>
              </div>
            )}

            {/* Toggle switch for login vs register */}
            {isLogin ? (
              // SIGN IN FORM
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-charcoal-muted uppercase tracking-wider ml-0.5">Email Address</label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className="w-full border border-gray-200 focus:border-charcoal focus:ring-0 rounded-lg px-4 py-2.5 text-sm transition-all outline-none font-medium"
                    placeholder="email@example.com"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center px-0.5">
                    <label className="block text-[9px] font-bold text-charcoal-muted uppercase tracking-wider">Password</label>
                    <button
                      type="button"
                      onClick={() => navigate(`/forgot-password?login=${encodeURIComponent(isAdminLogin ? '/admin/login' : '/login')}`)}
                      className="text-[9px] font-bold text-blue-600 uppercase hover:underline"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      name="password"
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className="w-full border border-gray-200 focus:border-charcoal focus:ring-0 rounded-lg pl-4 pr-10 py-2.5 text-sm transition-all outline-none font-medium"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-charcoal"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#1b1924] hover:bg-[#272433] text-white text-sm font-semibold py-3 rounded-lg w-full transition-colors cursor-pointer text-center tracking-wide mt-2"
                >
                  {loading ? 'Continuing...' : 'Continue'}
                </button>

                {!isAdminLogin && (
                  <>
                    <div className="flex items-center gap-3 my-2">
                      <div className="h-px flex-1 bg-gray-150" />
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">or</span>
                      <div className="h-px flex-1 bg-gray-150" />
                    </div>

                    <button
                      type="button"
                      onClick={handleGoldenRichSso}
                      className="w-full py-2.5 rounded-lg border border-gray-200 bg-white text-charcoal font-bold uppercase tracking-wider text-[10px] hover:border-charcoal hover:bg-gray-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Login with GRP
                    </button>

                    <div className="mt-4 text-center text-xs font-semibold text-gray-500">
                      Don't have an account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(false);
                          setError('');
                          setSuccess('');
                          resetOtpFlow();
                        }}
                        className="text-blue-600 hover:underline font-extrabold cursor-pointer ml-1 text-xs"
                      >
                        Sign Up
                      </button>
                    </div>
                  </>
                )}
              </form>
            ) : (
              // REGISTER / SIGN UP FORM
              <div className="space-y-3">
                {!showOTPVerification ? (
                  <div className="space-y-2">
                    {/* Role selector Guest/Host pills */}
                    <div className="flex justify-between items-center bg-gray-50 p-1 rounded-xl border border-gray-100 max-w-[200px] mx-auto mb-2">
                      <button
                        type="button"
                        onClick={() => setRegisterData({ ...registerData, role: 'guest' })}
                        className={`flex-1 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition ${
                          registerData.role === 'guest' ? 'bg-[#1b1924] text-white shadow-sm' : 'text-gray-400'
                        }`}
                      >
                        Guest
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegisterData({ ...registerData, role: 'host' })}
                        className={`flex-1 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition ${
                          registerData.role === 'host' ? 'bg-[#1b1924] text-white shadow-sm' : 'text-gray-400'
                        }`}
                      >
                        Host
                      </button>
                    </div>

                    {/* Compact Input Grid */}
                    <div className="grid grid-cols-2 gap-2 text-left">
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-charcoal-muted uppercase">Full Name</label>
                        <input
                          id="register-full-name"
                          type="text"
                          value={registerData.full_name}
                          onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
                          className="w-full border border-gray-200 focus:border-charcoal focus:ring-0 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none"
                          placeholder="Full Name"
                          required
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-charcoal-muted uppercase">Phone Number</label>
                        <input
                          id="register-phone"
                          type="tel"
                          value={registerData.phone}
                          onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                          className="w-full border border-gray-200 focus:border-charcoal focus:ring-0 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none"
                          placeholder="Phone"
                          required
                        />
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-charcoal-muted uppercase">Email</label>
                        <input
                          id="register-email"
                          type="email"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                          className="w-full border border-gray-200 focus:border-charcoal focus:ring-0 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none"
                          placeholder="Email"
                          required
                        />
                      </div>

                      <div className="space-y-0.5 relative" ref={cityFieldRef}>
                        <label className="text-[9px] font-bold text-charcoal-muted uppercase">City</label>
                        <input
                          id="register-city"
                          type="text"
                          value={registerData.city}
                          onFocus={() => setCityDropdownOpen(true)}
                          onChange={(e) => {
                            setRegisterData({ ...registerData, city: e.target.value });
                            setCityDropdownOpen(true);
                          }}
                          className="w-full border border-gray-200 focus:border-charcoal focus:ring-0 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none"
                          placeholder="Search city"
                          required
                        />
                        {cityDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1 z-[9999] max-h-24 overflow-y-auto bg-white border border-gray-100 rounded-lg shadow-lg">
                            {filteredCities.map(city => (
                              <button
                                key={city}
                                type="button"
                                onClick={() => {
                                  setRegisterData({ ...registerData, city });
                                  setCityDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-gray-55"
                              >
                                {city}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-0.5 text-left">
                      <label className="text-[9px] font-bold text-charcoal-muted uppercase">Password</label>
                      <div className="relative">
                        <input
                          id="register-password"
                          type={showRegisterPassword ? 'text' : 'password'}
                          value={registerData.password}
                          onChange={(e) => setRegisterData({
                            ...registerData,
                            password: e.target.value.replace(/\s/g, '').slice(0, 32)
                          })}
                          className="w-full border border-gray-200 focus:border-charcoal focus:ring-0 rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold outline-none"
                          placeholder="Password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegisterPassword(v => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showRegisterPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Broker/Employee dropdowns for Host role */}
                    {registerData.role === 'host' && (
                      <div className="grid grid-cols-2 gap-2 text-left animate-fade-in">
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-charcoal-muted uppercase">Broker</label>
                          <select
                            value={registerData.lg_code}
                            onChange={(e) => setRegisterData({ ...registerData, lg_code: e.target.value })}
                            className="w-full border border-gray-200 focus:border-charcoal focus:ring-0 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none"
                          >
                            <option value="">Select Broker</option>
                            {availableBrokers.map(b => (
                              <option key={b.user_id} value={b.lg_code}>{b.full_name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-charcoal-muted uppercase">Employee</label>
                          <select
                            value={registerData.employee_code}
                            onChange={(e) => setRegisterData({ ...registerData, employee_code: e.target.value })}
                            className="w-full border border-gray-200 focus:border-charcoal focus:ring-0 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none"
                          >
                            <option value="">Select Employee</option>
                            {availableEmployees.map(emp => (
                              <option key={emp.user_id} value={emp.employee_code}>{emp.full_name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Legal Checkbox */}
                    <div className="flex items-start space-x-2 pt-1">
                      <input
                        id="register-terms"
                        type="checkbox"
                        checked={registerData.terms_accepted}
                        onChange={(e) => setRegisterData({ ...registerData, terms_accepted: e.target.checked })}
                        className="mt-0.5 w-3.5 h-3.5 text-terracotta border-gray-200 focus:ring-0 cursor-pointer"
                        required
                      />
                      <label className="text-[9px] text-charcoal-muted font-bold leading-tight cursor-pointer">
                        I accept the <LegalLinks className="inline text-terracotta" context={registerData.role === 'host' ? 'host_registration' : 'guest_registration'} />.
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={sendOTP}
                      disabled={loading}
                      className="bg-[#1b1924] hover:bg-[#272433] text-white text-xs font-semibold py-2.5 rounded-lg w-full transition-colors cursor-pointer tracking-wider mt-2"
                    >
                      {loading ? 'Continuing...' : 'Continue'}
                    </button>

                    <div className="mt-4 text-center text-xs font-semibold text-gray-500">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(true);
                          setError('');
                          setSuccess('');
                          resetOtpFlow();
                        }}
                        className="text-blue-600 hover:underline font-extrabold cursor-pointer ml-1 text-xs"
                      >
                        Log In
                      </button>
                    </div>
                  </div>
                ) : (
                  // OTP VERIFICATION STEP
                  <div className="space-y-4 text-center animate-fade-in pt-4">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-terracotta/10 rounded-xl flex items-center justify-center mb-2 border border-terracotta/20">
                        <ShieldCheck className="w-6 h-6 text-terracotta" />
                      </div>
                      <h4 className="text-lg font-bold tracking-tight text-charcoal">Enter OTP</h4>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-center gap-1.5">
                        {Array.from({ length: 6 }).map((_, index) => (
                          <input
                            key={index}
                            ref={(element) => { otpInputRefs.current[index] = element; }}
                            type="text"
                            inputMode="numeric"
                            autoComplete={index === 0 ? 'one-time-code' : 'off'}
                            value={otpDigits[index] || ''}
                            onChange={(e) => handleOtpBoxChange(index, e.target.value)}
                            onKeyDown={(e) => handleOtpBoxKeyDown(index, e)}
                            onFocus={(e) => e.target.select()}
                            className="w-8 h-10 text-center text-base font-black bg-white rounded-lg border border-gray-200 focus:border-charcoal focus:ring-0 outline-none text-charcoal"
                            maxLength={6}
                          />
                        ))}
                      </div>
                      {otpSecondsRemaining > 0 ? (
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                          OTP valid for {otpTimerLabel}
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={sendOTP}
                          disabled={loading}
                          className="text-[9px] font-bold text-terracotta uppercase tracking-wider hover:underline"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5 pt-2">
                      <button
                        onClick={verifyOTP}
                        disabled={loading}
                        className="bg-[#1b1924] hover:bg-[#272433] text-white text-xs font-semibold py-2.5 rounded-lg w-full transition-colors cursor-pointer tracking-wider"
                      >
                        {loading ? 'Verifying...' : 'Submit'}
                      </button>

                      <button
                        onClick={resetOtpFlow}
                        disabled={loading}
                        className="text-[9px] font-bold text-charcoal-muted uppercase hover:text-terracotta block mx-auto underline"
                      >
                        Change Phone
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Footer Notice */}
          <div className="w-full pt-4 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
              By signing up, you agree to our <br className="md:hidden" />
              <a href="/terms" className="text-blue-500 hover:underline">Terms & Conditions</a> and <a href="/privacy" className="text-blue-500 hover:underline">Privacy Policy</a>
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AuthPage;
