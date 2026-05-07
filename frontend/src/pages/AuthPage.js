import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Mail, Lock, Phone, User, MapPin } from 'lucide-react';
import { authAPI } from '../services/api';

const AuthPage = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Login form
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  
  // Registration form
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
  
  // OTP verification
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
        setGeneratedOTP(response.data.otp);
        setShowOTPVerification(true);
        setSuccess(`OTP sent to ${registerData.phone}. OTP: ${response.data.otp}`);
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
    <div className="min-h-screen bg-sand-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Building2 className="w-10 h-10 text-terracotta" />
            <h1 className="text-3xl font-extrabold text-charcoal">Golden-X-Host</h1>
          </div>
          <p className="text-charcoal-light">Short Term Rentals Platform</p>
        </div>

        {/* Auth Card */}
        <div className="dashboard-card" data-testid="auth-card">
          {/* Toggle between Login and Register */}
          <div className="flex border-b border-stone mb-6">
            <button
              onClick={() => {
                setIsLogin(true);
                setError('');
                setSuccess('');
              }}
              className={`flex-1 py-3 font-semibold transition ${
                isLogin
                  ? 'text-terracotta border-b-2 border-terracotta'
                  : 'text-charcoal-light hover:text-charcoal'
              }`}
              data-testid="login-tab"
            >
              Login
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError('');
                setSuccess('');
                setShowOTPVerification(false);
              }}
              className={`flex-1 py-3 font-semibold transition ${
                !isLogin
                  ? 'text-terracotta border-b-2 border-terracotta'
                  : 'text-charcoal-light hover:text-charcoal'
              }`}
              data-testid="register-tab"
            >
              Register
            </button>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4" data-testid="error-message">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4" data-testid="success-message">
              {success}
            </div>
          )}

          {/* Login Form */}
          {isLogin ? (
            <form onSubmit={handleLogin} data-testid="login-form">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-charcoal mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-charcoal-light" />
                    <input
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      className="input-field pl-12"
                      placeholder="your@email.com"
                      required
                      data-testid="login-email"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-charcoal mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-charcoal-light" />
                    <input
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className="input-field pl-12"
                      placeholder="••••••••"
                      required
                      data-testid="login-password"
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                  data-testid="login-submit"
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </div>
            </form>
          ) : (
            // Registration Form
            <div data-testid="register-form">
              {!showOTPVerification ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-2">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-charcoal-light" />
                      <input
                        type="text"
                        value={registerData.full_name}
                        onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
                        className="input-field pl-12"
                        placeholder="Rajesh Sharma"
                        required
                        data-testid="register-fullname"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-2">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-charcoal-light" />
                      <input
                        type="email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        className="input-field pl-12"
                        placeholder="your@email.com"
                        required
                        data-testid="register-email"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-2">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-charcoal-light" />
                      <input
                        type="tel"
                        value={registerData.phone}
                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                        className="input-field pl-12"
                        placeholder="+919876543210"
                        required
                        data-testid="register-phone"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-2">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-charcoal-light" />
                      <input
                        type="password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        className="input-field pl-12"
                        placeholder="••••••••"
                        required
                        data-testid="register-password"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-2">City</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-charcoal-light" />
                      <input
                        type="text"
                        value={registerData.city}
                        onChange={(e) => setRegisterData({ ...registerData, city: e.target.value })}
                        className="input-field pl-12"
                        placeholder="Pune"
                        data-testid="register-city"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-2">Register as</label>
                    <select
                      value={registerData.role}
                      onChange={(e) => setRegisterData({ ...registerData, role: e.target.value })}
                      className="input-field"
                      data-testid="register-role"
                    >
                      <option value="guest">Guest / Renter</option>
                      <option value="host">Property Owner / Host</option>
                    </select>
                  </div>
                  
                  {registerData.role === 'host' && (
                    <div>
                      <label className="block text-sm font-semibold text-charcoal mb-2">
                        LG Code (Broker ID) - Optional
                      </label>
                      <input
                        type="text"
                        value={registerData.lg_code}
                        onChange={(e) => setRegisterData({ ...registerData, lg_code: e.target.value })}
                        className="input-field"
                        placeholder="Enter your broker's LG Code or leave blank"
                        data-testid="register-lgcode"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      checked={registerData.terms_accepted}
                      onChange={(e) => setRegisterData({ ...registerData, terms_accepted: e.target.checked })}
                      className="mt-1"
                      required
                      data-testid="register-terms"
                    />
                    <label className="text-sm text-charcoal-light">
                      I accept the Terms & Conditions and Privacy Policy
                    </label>
                  </div>
                  
                  <button
                    type="button"
                    onClick={sendOTP}
                    disabled={loading}
                    className="btn-primary w-full"
                    data-testid="register-send-otp"
                  >
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </div>
              ) : (
                // OTP Verification
                <div className="space-y-4" data-testid="otp-verification">
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-2">
                      Enter OTP sent to {registerData.phone}
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="input-field text-center text-2xl tracking-widest"
                      placeholder="000000"
                      maxLength={6}
                      data-testid="otp-input"
                    />
                  </div>
                  
                  <button
                    onClick={verifyOTP}
                    disabled={loading}
                    className="btn-primary w-full"
                    data-testid="verify-otp-btn"
                  >
                    {loading ? 'Verifying...' : 'Verify & Register'}
                  </button>
                  
                  <button
                    onClick={sendOTP}
                    disabled={loading}
                    className="btn-secondary w-full"
                    data-testid="resend-otp-btn"
                  >
                    Resend OTP
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-terracotta hover:underline font-medium"
            data-testid="back-to-home"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
