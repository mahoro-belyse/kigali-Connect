import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar, Home, Tag, Info, Mail, ChevronDown,
  Menu, X, LayoutDashboard, LogOut, List, Eye,
  LogIn, UserPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Mega dropdown items (matches prompt spec exactly) ────────────────────────
const megaItems = [
  {
    label: 'Events Listing',
    to: '/events',
    icon: List,
    desc: 'Browse upcoming and trending events',
  },
  {
    label: 'Event Details',
    to: '/events',
    icon: Eye,
    desc: 'View schedules, speakers, tickets and venue',
  },
  {
    label: 'Login',
    to: '/login',
    icon: LogIn,
    desc: 'Access your dashboard and bookings',
  },
  {
    label: 'Register',
    to: '/register',
    icon: UserPlus,
    desc: 'Create an account to manage events and tickets',
  },
];

// ─── Main nav links ────────────────────────────────────────────────────────────
const navLinks = [
  { to: '/pricing', label: 'Pricing',  icon: Tag  },
  { to: '/about',   label: 'About',    icon: Info },
  { to: '/contact', label: 'Contact',  icon: Mail },
];

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const [megaOpen,   setMegaOpen]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const megaRef = useRef<HTMLDivElement>(null);

  // ── Close mobile menu on route change ────────────────────────────────────
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // ── Scroll blur effect ────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  const linkClass = (path: string) =>
    `text-sm font-medium flex items-center gap-1.5 transition-colors ${
      isActive(path) ? 'text-[#b87333]' : 'text-[#f5f0e8] hover:text-[#b87333]'
    }`;

  return (
    <nav
      className={`sticky top-0 z-50 border-b border-[rgba(184,115,51,0.15)] transition-all duration-300 ${
        scrolled
          ? 'bg-[#1a1a1a]/95 backdrop-blur-xl shadow-lg shadow-black/30'
          : 'bg-[#1a1a1a]/85 backdrop-blur-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">

        {/* ── Logo ───────────────────────────────────────────────────────── */}
        <Link to="/" className="text-xl font-extrabold shrink-0">
          <span
            style={{
              background: 'linear-gradient(135deg,#b87333,#d4956a)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Smart
          </span>
          <span className="text-[#f5f0e8]">Event</span>
        </Link>

        {/* ── Desktop nav ─────────────────────────────────────────────────── */}
        <div className="hidden md:flex items-center gap-6">

          {/* Home */}
          <Link to="/" className={linkClass('/')}>
            <Home className="w-3.5 h-3.5" />Home
          </Link>

          {/* Events mega dropdown */}
          <div
            ref={megaRef}
            className="relative"
            onMouseEnter={() => setMegaOpen(true)}
            onMouseLeave={() => setMegaOpen(false)}
          >
            <button
              className={`text-sm font-medium flex items-center gap-1 transition-colors ${
                location.pathname.startsWith('/events')
                  ? 'text-[#b87333]'
                  : 'text-[#f5f0e8] hover:text-[#b87333]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Events
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  megaOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Mega dropdown */}
            <div
              className={`absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72
                bg-[#1e1e1e] rounded-2xl border border-[rgba(184,115,51,0.2)]
                shadow-2xl shadow-black/50 p-2
                transition-all duration-200 origin-top
                ${megaOpen
                  ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                }`}
            >
              {megaItems.map((item) => (
                <Link
                  key={item.to + item.label}
                  to={item.to}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-[rgba(184,115,51,0.08)] transition-colors group"
                  onClick={() => setMegaOpen(false)}
                >
                  <div className="w-8 h-8 rounded-lg bg-[rgba(184,115,51,0.12)] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[rgba(184,115,51,0.2)] transition-colors">
                    <item.icon className="w-4 h-4 text-[#b87333]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#f5f0e8]">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Other links */}
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={linkClass(to)}>
              <Icon className="w-3.5 h-3.5" />{label}
            </Link>
          ))}
        </div>

        {/* ── Right side ──────────────────────────────────────────────────── */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated && user ? (
            <>
              {/* User info + dashboard link */}
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
                  border border-[rgba(184,115,51,0.2)] text-[#f5f0e8]
                  hover:bg-[rgba(184,115,51,0.08)] transition-colors"
              >
                {/* Avatar circle */}
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.full_name}
                    className="w-6 h-6 rounded-full object-cover border border-[#b87333]"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#b87333] flex items-center justify-center text-white text-xs font-bold">
                    {user.full_name?.charAt(0).toUpperCase() ?? 'U'}
                  </div>
                )}
                <LayoutDashboard className="w-4 h-4 text-[#b87333]" />
                <span className="hidden lg:inline max-w-[120px] truncate">
                  {user.full_name}
                </span>
                {/* Role badge */}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold hidden xl:inline ${
                  user.role === 'admin'
                    ? 'bg-[rgba(184,115,51,0.2)] text-[#b87333]'
                    : user.role === 'event_manager'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {user.role === 'event_manager' ? 'Manager' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
              </Link>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-xl text-sm font-medium text-gray-400
                  hover:text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#f5f0e8]
                  border border-[rgba(184,115,51,0.2)] hover:bg-[rgba(184,115,51,0.08)] transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white
                  hover:opacity-90 hover:scale-[1.02] transition-all"
                style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* ── Mobile hamburger ─────────────────────────────────────────────── */}
        <button
          className="md:hidden text-[#f5f0e8] p-1"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ── Mobile menu ──────────────────────────────────────────────────────── */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          mobileOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        } bg-[#1a1a1a] border-t border-[rgba(184,115,51,0.15)]`}
      >
        <div className="px-4 py-4 space-y-1">
          {[
            ['/', 'Home'],
            ['/events', 'Events'],
            ['/pricing', 'Pricing'],
            ['/about', 'About'],
            ['/contact', 'Contact'],
            ['/faq', 'FAQ'],
          ].map(([to, label]) => (
            <Link
              key={to}
              to={to}
              className={`block py-3 px-3 text-sm font-medium rounded-xl transition-colors ${
                isActive(to)
                  ? 'text-[#b87333] bg-[rgba(184,115,51,0.08)]'
                  : 'text-[#f5f0e8] hover:text-[#b87333] hover:bg-[rgba(184,115,51,0.05)]'
              }`}
            >
              {label}
            </Link>
          ))}

          <div className="pt-3 border-t border-[rgba(184,115,51,0.1)]">
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 py-3 px-3 rounded-xl text-sm font-semibold text-[#b87333] bg-[rgba(184,115,51,0.08)]"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard ({user.full_name})
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full py-3 px-3 rounded-xl text-sm text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />Logout
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Link
                  to="/login"
                  className="flex-1 py-2.5 text-center text-sm border border-[rgba(184,115,51,0.2)] rounded-xl text-[#f5f0e8]"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="flex-1 py-2.5 text-center text-sm text-white rounded-xl font-semibold"
                  style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
