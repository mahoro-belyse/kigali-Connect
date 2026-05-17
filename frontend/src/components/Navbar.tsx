import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar, Home, Tag, Info, Mail, ChevronDown,
  Menu, X, LayoutDashboard, LogOut, List, Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';


// ─── Mega dropdown items ───────────────────────────────────────────────────────
const megaItems = [
  {
    label: 'Events Listing',
    to: null,           // handled via anchor scroll
    hash: 'featured-events',
    icon: List,
    desc: 'Browse upcoming and trending events',
  },
  {
    label: 'Event Details',
    to: '/events',
    hash: null,
    icon: Eye,
    desc: 'View schedules, speakers, tickets and venue',
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
  const closeTimeout = useRef<number | null>(null);

  // ── Close mobile menu on route change ────────────────────────────────────
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // ── Scroll blur effect ────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const clearCloseTimeout = () => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
  };

  const handleMouseEnter = () => {
    clearCloseTimeout();
    setMegaOpen(true);
  };

  const handleMouseLeave = () => {
    clearCloseTimeout();
    closeTimeout.current = window.setTimeout(() => {
      setMegaOpen(false);
    }, 200);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // ── Handle Events Listing click: go to home then scroll to #featured-events
  const handleFeaturedEventsClick = () => {
    setMegaOpen(false);
    if (location.pathname === '/') {
      // Already on home — just scroll
      document.getElementById('featured-events')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Navigate to home, then scroll after render
      navigate('/');
      setTimeout(() => {
        document.getElementById('featured-events')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const linkClass = (path: string) =>
    `text-sm font-medium flex items-center gap-1.5 transition-colors ${
      isActive(path) ? 'text-copper' : 'text-ivory-light hover:text-copper'
    }`;

  return (
    <nav
      className={`sticky top-0 z-50 border-b border-copper/15 transition-all duration-300 ${
        scrolled
          ? 'bg-dark-elevation/95 backdrop-blur-xl shadow-lg shadow-black/30'
          : 'bg-dark-elevation/85 backdrop-blur-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">

        {/* ── Logo ───────────────────────────────────────────────────────── */}
        <Link to="/" className="text-xl font-extrabold shrink-0">
          <span className="bg-gradient-to-br from-copper to-copper-light bg-clip-text text-transparent">
            Smart
          </span>
          <span className="text-ivory-light">Event</span>
        </Link>

        {/* ── Desktop nav ─────────────────────────────────────────────────── */}
        <div className="hidden md:flex items-center gap-6">

          {/* Home */}
          <Link to="/" className={linkClass('/')}>
            <Home className="w-3.5 h-3.5" />Home
          </Link>

          {/* Events mega dropdown */}
          <div className="relative">
            <button
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className={`text-sm font-medium flex items-center gap-1 transition-colors ${
                location.pathname.startsWith('/events')
                  ? 'text-copper'
                  : 'text-ivory-light hover:text-copper'
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
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className={`absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72
                bg-dark-surface rounded-2xl border border-copper/20
                shadow-2xl shadow-black/50 p-2
                transition-all duration-200 origin-top
                ${megaOpen
                  ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                }`}
            >
              {megaItems.map((item) => {
                const Icon = item.icon;
                const inner = (
                  <>
                    <div className="w-8 h-8 rounded-lg bg-copper/12 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-copper/20 transition-colors">
                      <Icon className="w-4 h-4 text-copper" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ivory-light">{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </>
                );

                if (item.hash) {
                  // Events Listing — scroll to #featured-events on home
                  return (
                    <button
                      key={item.label}
                      onClick={handleFeaturedEventsClick}
                      className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-copper/8 transition-colors group text-left"
                    >
                      {inner}
                    </button>
                  );
                }

                // Event Details — goes to /events
                return (
                  <Link
                    key={item.label}
                    to={item.to!}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-copper/8 transition-colors group"
                    onClick={() => setMegaOpen(false)}
                  >
                    {inner}
                  </Link>
                );
              })}
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
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
                  border border-copper/20 text-ivory-light
                  hover:bg-copper/8 transition-colors"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.full_name}
                    className="w-6 h-6 rounded-full object-cover border border-copper"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-copper flex items-center justify-center text-white text-xs font-bold">
                    {user.full_name?.charAt(0).toUpperCase() ?? 'U'}
                  </div>
                )}
                <LayoutDashboard className="w-4 h-4 text-copper" />
                <span className="hidden lg:inline max-w-[120px] truncate">
                  {user.full_name}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold hidden xl:inline ${
                  user.role === 'admin'
                    ? 'bg-copper/20 text-copper'
                    : user.role === 'event_manager'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {user.role === 'event_manager' ? 'Manager' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
              </Link>

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
                className="px-4 py-2 rounded-xl text-sm font-medium text-ivory-light
                  border border-copper/20 hover:bg-copper/8 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white
                  hover:opacity-90 hover:scale-[1.02] transition-all bg-gradient-to-br from-copper to-copper-light"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* ── Mobile hamburger ─────────────────────────────────────────────── */}
        <button
          className="md:hidden text-ivory-light p-1"
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
        } bg-dark-elevation border-t border-copper/15`}
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
                  ? 'text-copper bg-copper/8'
                  : 'text-ivory-light hover:text-copper hover:bg-copper/5'
              }`}
            >
              {label}
            </Link>
          ))}

          <div className="pt-3 border-t border-copper/10">
           
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 py-3 px-3 rounded-xl text-sm font-semibold text-copper bg-copper/8"
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
                  className="flex-1 py-2.5 text-center text-sm border border-copper/20 rounded-xl text-ivory-light"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="flex-1 py-2.5 text-center text-sm text-white rounded-xl font-semibold bg-gradient-to-br from-copper to-copper-light"
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