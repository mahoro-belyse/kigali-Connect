import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Calendar, ClipboardList, CreditCard,
  TrendingUp, Bell, Settings, Users, LogOut, Menu,
  ChevronLeft, QrCode, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../api/client';

// ─── Nav item definition ──────────────────────────────────────────────────────
interface NavItem {
  icon: React.ElementType;
  label: string;
  to: string;
  roles: ('admin' | 'event_manager' | 'client')[];
}

const ALL_NAV: NavItem[] = [
  { icon: Home,          label: 'Overview',      to: '/dashboard',               roles: ['admin','event_manager','client'] },
  { icon: Calendar,      label: 'Events',         to: '/dashboard/events',        roles: ['admin','event_manager'] },
  { icon: ClipboardList, label: 'My Bookings',    to: '/dashboard/bookings',      roles: ['client'] },
  { icon: ClipboardList, label: 'All Bookings',   to: '/dashboard/bookings',      roles: ['admin','event_manager'] },
  { icon: CreditCard,    label: 'Payments',       to: '/dashboard/payments',      roles: ['admin','event_manager','client'] },
  { icon: QrCode,        label: 'Check-In',       to: '/dashboard/checkin',       roles: ['admin','event_manager'] },
  { icon: TrendingUp,    label: 'Reports',        to: '/dashboard/reports',       roles: ['admin','event_manager'] },
  { icon: Users,         label: 'Users',          to: '/dashboard/users',         roles: ['admin'] },
  { icon: Bell,          label: 'Notifications',  to: '/dashboard/notifications', roles: ['admin','event_manager','client'] },
  { icon: Settings,      label: 'Profile',        to: '/dashboard/profile',       roles: ['admin','event_manager','client'] },
];

const ROLE_BADGE: Record<string, string> = {
  admin:         'bg-[rgba(184,115,51,0.2)] text-[#b87333]',
  event_manager: 'bg-blue-500/20 text-blue-400',
  client:        'bg-gray-500/20 text-gray-400',
};

const ROLE_LABEL: Record<string, string> = {
  admin:         'Admin',
  event_manager: 'Manager',
  client:        'Client',
};

// ─── Sidebar component ────────────────────────────────────────────────────────
interface SidebarProps {
  collapsed: boolean;
  mobile?: boolean;
  onCollapse?: () => void;
  onClose?: () => void;
  navItems: NavItem[];
  unreadCount: number;
}

function Sidebar({ collapsed, mobile = false, onCollapse, onClose, navItems, unreadCount }: SidebarProps) {
  const { user, logout } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (item: NavItem) =>
    item.to === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(item.to);

  const showLabel = mobile || !collapsed;

  return (
    <div
      className={`flex flex-col h-full bg-[#1a1a1a] border-r border-[rgba(184,115,51,0.15)]
        transition-all duration-300 ${mobile ? 'w-64' : collapsed ? 'w-[72px]' : 'w-60'}`}
    >
      {/* ── Logo row ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-4 border-b border-[rgba(184,115,51,0.15)] h-16">
        {showLabel && (
          <Link to="/" className="text-lg font-bold">
            <span style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Smart
            </span>
            <span className="text-[#f5f0e8]">Event</span>
          </Link>
        )}
        {/* Desktop collapse toggle */}
        {!mobile && onCollapse && (
          <button
            onClick={onCollapse}
            className="text-gray-400 hover:text-[#b87333] p-1.5 rounded-lg hover:bg-[rgba(184,115,51,0.1)] transition-colors"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        )}
        {/* Mobile close */}
        {mobile && onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-[#f5f0e8] p-1 transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── User info ──────────────────────────────────────────────────────── */}
      <div className={`p-4 border-b border-[rgba(184,115,51,0.15)] ${!showLabel ? 'flex justify-center' : ''}`}>
        <div className="flex items-center gap-3">
          {/* Avatar */}
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.full_name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-[#b87333] shrink-0"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ring-2 ring-[#b87333]"
              style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
            >
              {(user?.full_name ?? 'U').charAt(0).toUpperCase()}
            </div>
          )}
          {showLabel && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#f5f0e8] truncate">{user?.full_name ?? 'User'}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[user?.role ?? 'client']}`}>
                {ROLE_LABEL[user?.role ?? 'client']}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={`${item.to}-${item.label}`}
              to={item.to}
              onClick={onClose}
              title={!showLabel ? item.label : undefined}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all
                ${!showLabel ? 'justify-center' : ''}
                ${active
                  ? 'text-white font-medium shadow-md'
                  : 'text-gray-400 hover:text-[#f5f0e8] hover:bg-[rgba(184,115,51,0.08)]'
                }`}
              style={active ? { background: 'linear-gradient(135deg,#b87333,#d4956a)' } : {}}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {showLabel && <span>{item.label}</span>}

              {/* Unread badge on Notifications */}
              {item.to === '/dashboard/notifications' && unreadCount > 0 && (
                <span className={`${showLabel ? 'ml-auto' : 'absolute top-1 right-1'} min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center
                  ${active ? 'bg-white text-[#b87333]' : 'bg-[#b87333] text-white'}`}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Logout ─────────────────────────────────────────────────────────── */}
      <div className="p-2 border-t border-[rgba(184,115,51,0.15)]">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
            text-gray-400 hover:text-red-400 hover:bg-red-400/10 w-full transition-all
            ${!showLabel ? 'justify-center' : ''}`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {showLabel && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}

// ─── Main layout ─────────────────────────────────────────────────────────────

export default function DashboardLayout() {
  const { user } = useAuth();
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  // Filter nav items by current user role
  const role      = (user?.role ?? 'client') as 'admin' | 'event_manager' | 'client';
  const navItems  = ALL_NAV.filter((n) => n.roles.includes(role));

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Fetch unread notification count
  useEffect(() => {
    notificationsApi.list({ unread_only: true, per_page: 1 })
      .then((res) => setUnreadCount(res.data?.unread_count ?? 0))
      .catch(() => {});
  }, [location.pathname]); // refresh on each page change

  return (
    <div className="min-h-screen bg-[#111111] flex">

      {/* ── Desktop sidebar (fixed) ─────────────────────────────────────────── */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40">
        <Sidebar
          collapsed={collapsed}
          navItems={navItems}
          unreadCount={unreadCount}
          onCollapse={() => setCollapsed((v) => !v)}
        />
      </aside>

      {/* ── Mobile sidebar overlay ───────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="relative z-10 h-full">
            <Sidebar
              collapsed={false}
              mobile
              navItems={navItems}
              unreadCount={unreadCount}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── Main content area ────────────────────────────────────────────────── */}
      <main
        className={`flex-1 transition-all duration-300 min-h-screen
          ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-60'}`}
      >
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-[#1a1a1a]/80 backdrop-blur-md border-b border-[rgba(184,115,51,0.15)] px-4 sm:px-6 py-3 flex items-center justify-between h-14">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-[#f5f0e8] p-2 -ml-2 rounded-lg hover:bg-[rgba(184,115,51,0.1)] transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden lg:block" />

          {/* Top-right actions */}
          <div className="flex items-center gap-2">
            {/* Notifications bell */}
            <Link
              to="/dashboard/notifications"
              className="relative p-2 text-gray-400 hover:text-[#b87333] rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-bold bg-[#b87333] text-white flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Avatar shortcut */}
            <Link to="/dashboard/profile" className="flex items-center gap-2 pl-1">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.full_name}
                  className="w-7 h-7 rounded-full object-cover border border-[#b87333]"
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border border-[#b87333]"
                  style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
                >
                  {(user?.full_name ?? 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
          </div>
        </div>

        {/* Page content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
