import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from 'lucide-react';
import { authAPI } from '../services/api';
import SEO from '../components/SEO';


const safeLoginPath = (value) => value === '/admin/login' ? value : '/login';

const errorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
};

const RecoveryShell = ({ children }) => (
  <main className="min-h-screen bg-[#F6F7F9] flex items-center justify-center px-4 py-10">
    <section className="w-full max-w-md bg-white border border-[#DDE2EA] rounded-lg shadow-premium p-6 sm:p-8">
      {children}
    </section>
  </main>
);

const StatusMessage = ({ type, children }) => {
  if (!children) return null;
  const isError = type === 'error';
  return (
    <div className={`mt-4 flex items-start gap-2.5 rounded-lg border p-3 text-sm ${
      isError
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-emerald-200 bg-emerald-50 text-emerald-800'
    }`}>
      {isError
        ? <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        : <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />}
      <span>{children}</span>
    </div>
  );
};

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginPath = safeLoginPath(searchParams.get('login'));
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim());
      setSent(true);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to send the reset link. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <RecoveryShell>
      <SEO title="Forgot Password" robots="noindex,nofollow" />
      <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
        <Mail className="w-6 h-6" />
      </div>
      <h1 className="mt-5 text-center text-2xl font-bold text-charcoal">Forgot Password?</h1>
      <p className="mt-2 text-center text-sm leading-6 text-charcoal-muted">
        Enter your registered email address to receive a password reset link.
      </p>

      {sent ? (
        <div className="mt-7">
          <StatusMessage type="success">
            If this email is registered, a reset link has been sent. Please check your inbox and spam folder.
          </StatusMessage>
          <button
            type="button"
            onClick={() => navigate(loginPath)}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 py-3.5 border border-[#DDE2EA] rounded-lg font-bold text-sm text-charcoal hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-7">
          <label htmlFor="recovery-email" className="block text-sm font-semibold text-charcoal">
            Registered email address
          </label>
          <div className="relative mt-2">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-muted" />
            <input
              id="recovery-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@example.com"
              className="w-full pl-12 pr-4 py-3.5 border border-[#DDE2EA] rounded-lg outline-none focus:border-terracotta focus:ring-4 focus:ring-terracotta/10"
              required
              autoFocus
            />
          </div>
          <StatusMessage type="error">{error}</StatusMessage>
          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 py-3.5 bg-terracotta text-white rounded-lg font-bold text-sm hover:bg-[#9A3412] disabled:opacity-60"
          >
            <Mail className="w-4 h-4" />
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
          <button
            type="button"
            onClick={() => navigate(loginPath)}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2 text-sm font-semibold text-charcoal hover:text-terracotta"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </button>
        </form>
      )}
    </RecoveryShell>
  );
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const requestedLoginPath = safeLoginPath(searchParams.get('login'));
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loginPath, setLoginPath] = useState(requestedLoginPath);

  const checks = useMemo(() => ({
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9\s]/.test(password),
  }), [password]);
  const passwordValid = Object.values(checks).every(Boolean);
  const passwordsMatch = password.length > 0 && password === confirmation;

  useEffect(() => {
    if (!success) return undefined;
    const timer = window.setTimeout(() => navigate(loginPath, { replace: true }), 2500);
    return () => window.clearTimeout(timer);
  }, [success, loginPath, navigate]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!token) {
      setError('This reset link is incomplete. Please request a new link.');
      return;
    }
    if (!passwordValid) {
      setError('Please meet every password requirement.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.resetPassword(token, password);
      setLoginPath(safeLoginPath(response.data?.login_path));
      setSuccess(true);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to reset password. Please request a new link.'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <RecoveryShell>
        <SEO title="Password Reset Successful" robots="noindex,nofollow" />
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="mt-5 text-center text-2xl font-bold text-charcoal">Password Reset Successful</h1>
        <p className="mt-2 text-center text-sm leading-6 text-charcoal-muted">
          Your password has been updated. Redirecting you to the login page...
        </p>
        <button
          type="button"
          onClick={() => navigate(loginPath, { replace: true })}
          className="mt-6 w-full py-3.5 bg-charcoal text-white rounded-lg font-bold text-sm hover:bg-black"
        >
          Continue to Login
        </button>
      </RecoveryShell>
    );
  }

  const requirements = [
    ['length', 'At least 8 characters'],
    ['uppercase', 'One uppercase letter'],
    ['lowercase', 'One lowercase letter'],
    ['number', 'One number'],
    ['special', 'One special character'],
  ];

  return (
    <RecoveryShell>
      <SEO title="Reset Password" robots="noindex,nofollow" />
      <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
        <LockKeyhole className="w-6 h-6" />
      </div>
      <h1 className="mt-5 text-center text-2xl font-bold text-charcoal">Reset Your Password</h1>
      <p className="mt-2 text-center text-sm text-charcoal-muted">Enter and confirm your new password.</p>

      <form onSubmit={submit} className="mt-7 space-y-5">
        <div>
          <label htmlFor="new-password" className="block text-sm font-semibold text-charcoal">New Password</label>
          <div className="relative mt-2">
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-4 pr-12 py-3.5 border border-[#DDE2EA] rounded-lg outline-none focus:border-terracotta focus:ring-4 focus:ring-terracotta/10"
              placeholder="Enter new password"
              required
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(value => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-charcoal-muted hover:text-charcoal"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <ul className="mt-3 space-y-1.5">
            {requirements.map(([key, label]) => (
              <li key={key} className={`flex items-center gap-2 text-xs ${checks[key] ? 'text-emerald-700' : 'text-charcoal-muted'}`}>
                <Check className="w-3.5 h-3.5" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-semibold text-charcoal">Confirm New Password</label>
          <div className="relative mt-2">
            <input
              id="confirm-password"
              type={showConfirmation ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="w-full px-4 pr-12 py-3.5 border border-[#DDE2EA] rounded-lg outline-none focus:border-terracotta focus:ring-4 focus:ring-terracotta/10"
              placeholder="Confirm new password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmation(value => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-charcoal-muted hover:text-charcoal"
              title={showConfirmation ? 'Hide password' : 'Show password'}
            >
              {showConfirmation ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <StatusMessage type="error">{error}</StatusMessage>
        <button
          type="submit"
          disabled={loading || !token || !passwordValid || !passwordsMatch}
          className="w-full py-3.5 bg-terracotta text-white rounded-lg font-bold text-sm hover:bg-[#9A3412] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
        <button
          type="button"
          onClick={() => navigate(requestedLoginPath)}
          className="w-full py-2 text-sm font-semibold text-charcoal hover:text-terracotta"
        >
          Back to Login
        </button>
      </form>
    </RecoveryShell>
  );
};

const PasswordRecoveryPage = ({ mode }) => (
  mode === 'forgot' ? <ForgotPassword /> : <ResetPassword />
);

export default PasswordRecoveryPage;
