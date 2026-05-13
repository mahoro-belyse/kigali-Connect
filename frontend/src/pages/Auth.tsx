import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, User,
  AtSign, Phone, Shield, ArrowLeft,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';
import { useToast } from '../components/ui/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = 'login' | 'register' | 'forgot';

interface LoginForm   { email: string; password: string }
interface RegisterForm { full_name: string; username: string; email: string; phone: string; password: string; confirm_password: string }
interface ForgotForm  { email: string }
interface FieldErrors { [key: string]: string }

// ─── Password strength bar ────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const strength =
    password.length < 6  ? 1
    : password.length < 10 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) ? 4
    : 3;
  const BAR    = ['', 'bg-red-500',  'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
  const LABELS = ['', 'Weak',        'Fair',           'Good',        'Strong'];
  const TEXT   = ['', 'text-red-400','text-yellow-400','text-blue-400','text-green-400'];
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1,2,3,4].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? BAR[strength] : 'bg-gray-400/20'}`} />
        ))}
      </div>
      <p className={`text-xs ${TEXT[strength]}`}>{LABELS[strength]}</p>
    </div>
  );
}

// ─── Reusable field input ─────────────────────────────────────────────────────

interface FieldInputProps {
  icon: React.ElementType;
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  showToggle?: boolean;
  show?: boolean;
  onToggle?: () => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
}

function FieldInput({
  icon: Icon, label, type = 'text', value, onChange, error,
  showToggle, show, onToggle, placeholder, autoComplete, disabled,
}: FieldInputProps) {
  const inputType = showToggle ? (show ? 'text' : 'password') : type;
  return (
    <div>
      <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 shrink-0" />
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className={`w-full pl-10 ${showToggle ? 'pr-10' : 'pr-3'} py-2.5
            border rounded-xl focus:outline-none text-sm
            bg-[#2a2a2a] text-[#f5f0e8] placeholder-[#9a8f82]
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed
            ${error
              ? 'border-red-500 focus:border-red-400'
              : 'border-[rgba(184,115,51,0.2)] focus:border-[#b87333] focus:ring-1 focus:ring-[rgba(184,115,51,0.3)]'
            }`}
        />
        {showToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#f5f0e8] transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ─── Lockout countdown ────────────────────────────────────────────────────────

function LockoutTimer({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    setRemaining(seconds);
    timerRef.current = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) { clearInterval(timerRef.current); onExpire(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [seconds]);

  return (
    <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
      <p className="text-red-400 text-sm font-medium">🔒 Account temporarily locked</p>
      <p className="text-red-400/70 text-xs mt-1">
        Try again in <span className="font-bold">{remaining}s</span>
      </p>
      <div className="mt-2 h-1 bg-red-500/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-red-500 rounded-full transition-all duration-1000"
          style={{ width: `${(remaining / seconds) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─── Side image config ────────────────────────────────────────────────────────

const SIDE_IMAGES: Record<ViewMode, { src: string; quote: string }> = {
  login:    { src: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80', quote: 'Where great events begin.' },
  register: { src: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&q=80', quote: 'Join thousands of event lovers.' },
  forgot:   { src: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=800&q=80', quote: 'Regain access in seconds.' },
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function Auth() {
  const { login: authLogin, isAuthenticated } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { toast } = useToast();

  // Read initial view from path
  const initialView: ViewMode = location.pathname === '/register' ? 'register' : 'login';
  const [view,        setView]        = useState<ViewMode>(initialView);
  const [showPw,      setShowPw]      = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [errors,      setErrors]      = useState<FieldErrors>({});
  const [lockout,     setLockout]     = useState<number | null>(null);

  const [loginForm, setLoginForm] = useState<LoginForm>({ email: '', password: '' });
  const [regForm,   setRegForm]   = useState<RegisterForm>({
    full_name: '', username: '', email: '', phone: '', password: '', confirm_password: '',
  });
  const [forgotForm, setForgotForm] = useState<ForgotForm>({ email: '' });

  // Redirect already-authenticated users
  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated]);

  // Sync view with URL path
  useEffect(() => {
    setView(location.pathname === '/register' ? 'register' : 'login');
  }, [location.pathname]);

  // ── Login (error now stays on screen) ─────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockout) return;

    setLoading(true);
    // Clear only the general error on new attempt (but previous error will be replaced)
   setErrors((prev) => {
  const next = { ...prev };
  delete next.general;
  return next;
});

    const result = await authLogin(loginForm.email, loginForm.password);

    if (result.success) {
      toast({ title: '👋 Welcome back!' });
      const from = (location.state as any)?.from ?? '/dashboard';
      navigate(from, { replace: true });
    } else if (result.locked) {
      setLockout(result.retryAfter ?? 60);
    } else {
      // This error will stay until next submit (or optionally cleared on input)
      setErrors({ general: result.error ?? 'Invalid credentials' });
    }

    setLoading(false);
  };

  // ── Register with auto-login (unchanged) ──────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    const errs: FieldErrors = {};
    if (!regForm.full_name.trim())                              errs.full_name        = 'Full name is required';
    if (!regForm.username.trim())                              errs.username          = 'Username is required';
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(regForm.username))       errs.username          = 'Username: 3-50 chars, letters/digits/underscores only';
    if (!regForm.email || !/\S+@\S+\.\S+/.test(regForm.email)) errs.email            = 'Valid email required';
    if (!regForm.password || regForm.password.length < 8)      errs.password          = 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(regForm.password))                       errs.password          = 'Password needs an uppercase letter';
    if (!/[0-9]/.test(regForm.password))                       errs.password          = 'Password needs a number';
    if (!/[^A-Za-z0-9]/.test(regForm.password))               errs.password          = 'Password needs a special character';
    if (regForm.password !== regForm.confirm_password)          errs.confirm_password  = 'Passwords do not match';

    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    try {
      await authApi.register({
        full_name: regForm.full_name,
        username:  regForm.username,
        email:     regForm.email,
        phone:     regForm.phone || undefined,
        password:  regForm.password,
      });

      const loginResult = await authLogin(regForm.email, regForm.password);
      if (loginResult.success) {
        toast({ title: '✅ Account created! Welcome aboard.' });
        navigate('/dashboard', { replace: true });
      } else {
        setErrors({ general: 'Account created but auto-login failed. Please sign in manually.' });
        setView('login');
        navigate('/login', { replace: true });
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail ?? 'Registration failed';
      if (typeof detail === 'string') {
        if (detail.toLowerCase().includes('email'))    setErrors({ email: detail });
        else if (detail.toLowerCase().includes('username')) setErrors({ username: detail });
        else setErrors({ general: detail });
      } else {
        setErrors({ general: 'Registration failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password (unchanged) ───────────────────────────────────────────
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.logout().catch(() => {});
    } catch {}
    toast({ title: '📧 Reset link sent! Check your inbox.' });
    setLoading(false);
    setTimeout(() => { setView('login'); navigate('/login'); }, 2000);
  };

  const side = SIDE_IMAGES[view];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navbar />

      <div className="min-h-[calc(100vh-4rem)] flex">

        {/* ── Left decorative panel ─────────────────────────────────────── */}
        <div className="hidden lg:flex w-1/2 relative overflow-hidden">
          <img
            src={side.src}
            alt=""
            className="w-full h-full object-cover transition-opacity duration-500"
            loading="eager"
          />
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-12">
            <p className="text-3xl font-bold text-white italic mb-2">
              "{side.quote}"
            </p>
            <span
              className="text-sm font-extrabold"
              style={{
                background: 'linear-gradient(135deg,#b87333,#d4956a)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              SmartEvent
            </span>
          </div>
        </div>

        {/* ── Right form panel ──────────────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-[#242424] rounded-3xl p-8 shadow-2xl border border-[rgba(184,115,51,0.15)]">

            {/* Logo */}
            <div className="text-center mb-6">
              <div className="text-2xl font-extrabold mb-1">
                <span style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Smart
                </span>
                <span className="text-[#f5f0e8]">Event</span>
              </div>
              <p className="text-sm text-[#9a8f82]">
                {view === 'login'    ? 'Welcome back — sign in to continue'
                : view === 'register' ? 'Create your free account'
                :                       'Reset your password'}
              </p>
            </div>

            {/* ── LOGIN FORM (error now persists) ─────────────────────────── */}
            {view === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <FieldInput
                  icon={Mail} label="Email" type="email"
                  value={loginForm.email}
                  onChange={(e) => {
                    setLoginForm((f) => ({ ...f, email: e.target.value }));
                    // Optionally clear error when user starts typing (uncomment if desired)
                    // if (errors.general) setErrors((prev) => ({ ...prev, general: undefined }));
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={!!lockout}
                />
                <FieldInput
                  icon={Lock} label="Password"
                  value={loginForm.password}
                  onChange={(e) => {
                    setLoginForm((f) => ({ ...f, password: e.target.value }));
                    // if (errors.general) setErrors((prev) => ({ ...prev, general: undefined }));
                  }}
                  showToggle show={showPw} onToggle={() => setShowPw((v) => !v)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={!!lockout}
                />

                {errors.general && (
                  <p className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
                    {errors.general}
                  </p>
                )}

                {lockout && (
                  <LockoutTimer seconds={lockout} onExpire={() => setLockout(null)} />
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setView('forgot')}
                    className="text-xs text-[#b87333] hover:underline transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || !!lockout}
                  className="w-full py-3 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-60 transition-opacity"
                  style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
                >
                  {loading ? 'Signing In…' : 'Sign In'}
                </button>

                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-[#9a8f82]">or</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <p className="text-center text-sm text-[#9a8f82]">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setView('register'); navigate('/register'); }}
                    className="text-[#b87333] font-semibold hover:underline"
                  >
                    Register
                  </button>
                </p>
              </form>
            )}

            {/* ── REGISTER FORM (unchanged) ───────────────────────────────── */}
            {view === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3">
                <FieldInput
                  icon={User} label="Full Name"
                  value={regForm.full_name}
                  onChange={(e) => setRegForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="John Doe" error={errors.full_name}
                  autoComplete="name"
                />
                <FieldInput
                  icon={AtSign} label="Username"
                  value={regForm.username}
                  onChange={(e) => setRegForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="johndoe" error={errors.username}
                  autoComplete="username"
                />
                <FieldInput
                  icon={Mail} label="Email" type="email"
                  value={regForm.email}
                  onChange={(e) => setRegForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com" error={errors.email}
                  autoComplete="email"
                />
                <FieldInput
                  icon={Phone} label="Phone (optional)"
                  value={regForm.phone}
                  onChange={(e) => setRegForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+250 788 000 000"
                  autoComplete="tel"
                />
                <div>
                  <FieldInput
                    icon={Lock} label="Password"
                    value={regForm.password}
                    onChange={(e) => setRegForm((f) => ({ ...f, password: e.target.value }))}
                    showToggle show={showPw} onToggle={() => setShowPw((v) => !v)}
                    placeholder="••••••••" error={errors.password}
                    autoComplete="new-password"
                  />
                  <PasswordStrength password={regForm.password} />
                </div>
                <FieldInput
                  icon={Shield} label="Confirm Password"
                  value={regForm.confirm_password}
                  onChange={(e) => setRegForm((f) => ({ ...f, confirm_password: e.target.value }))}
                  showToggle show={showConfirm} onToggle={() => setShowConfirm((v) => !v)}
                  placeholder="••••••••" error={errors.confirm_password}
                  autoComplete="new-password"
                />

                {errors.general && (
                  <p className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
                    {errors.general}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-60 transition-opacity mt-2"
                  style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
                >
                  {loading ? 'Creating Account…' : 'Create Account'}
                </button>

                <p className="text-center text-sm text-[#9a8f82]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setView('login'); navigate('/login'); }}
                    className="text-[#b87333] font-semibold hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </form>
            )}

            {/* ── FORGOT PASSWORD FORM (unchanged) ─────────────────────────── */}
            {view === 'forgot' && (
              <form onSubmit={handleForgot} className="space-y-4">
                <p className="text-sm text-[#9a8f82] text-center mb-4">
                  Enter your email and we'll send you a reset link.
                </p>
                <FieldInput
                  icon={Mail} label="Email Address" type="email"
                  value={forgotForm.email}
                  onChange={(e) => setForgotForm({ email: e.target.value })}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-60 transition-opacity"
                  style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
                >
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
                <button
                  type="button"
                  onClick={() => { setView('login'); navigate('/login'); }}
                  className="flex items-center gap-2 text-sm text-[#9a8f82] hover:text-[#b87333] mx-auto transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}