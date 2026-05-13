import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Calendar, ClipboardList, CreditCard,
  TrendingUp, Bell, Settings, Users, LogOut, 
  ChevronLeft, QrCode, X, LayoutDashboard, MoreHorizontal
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
  { icon: Home,          label: 'Home',          to: '/',                        roles: ['admin','event_manager','client'] },
  { icon: LayoutDashboard,label: 'Overview',     to: '/dashboard',               roles: ['admin','event_manager','client'] },
  { icon: Calendar,      label: 'Events',        to: '/dashboard/events',        roles: ['admin','event_manager'] },
  { icon: ClipboardList, label: 'My Bookings',   to: '/dashboard/bookings',      roles: ['client'] },
  { icon: ClipboardList, label: 'All Bookings',  to: '/dashboard/bookings',      roles: ['admin','event_manager'] },
  { icon: CreditCard,    label: 'Payments',      to: '/dashboard/payments',      roles: ['admin','event_manager','client'] },
  { icon: QrCode,        label: 'Check-In',      to: '/dashboard/checkin',       roles: ['admin','event_manager'] },
  { icon: TrendingUp,    label: 'Reports',       to: '/dashboard/reports',       roles: ['admin','event_manager'] },
  { icon: Users,         label: 'Users',         to: '/dashboard/users',         roles: ['admin'] },
  { icon: Bell,          label: 'Notifications', to: '/dashboard/notifications', roles: ['admin','event_manager','client'] },
  { icon: Settings,      label: 'Profile',       to: '/dashboard/profile',       roles: ['admin','event_manager','client'] },
];

const ROLE_BADGE: Record<string, string> = {
  admin:         'bg-copper/20 text-copper',
  event_manager: 'bg-blue-500/20 text-blue-400',
  client:        'bg-gray-500/20 text-gray-400',
};

const ROLE_LABEL: Record<string, string> = {
  admin:         'Admin',
  event_manager: 'Manager',
  client:        'Client',
};

// ─── Desktop Sidebar component ────────────────────────────────────────────────
interface SidebarProps {
  collapsed: boolean;
  onCollapse?: () => void;
  navItems: NavItem[];
  unreadCount: number;
}

function Sidebar({ collapsed, onCollapse, navItems, unreadCount }: SidebarProps) {
  const { user, logout } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (item: NavItem) => {
    if (item.to === '/') return location.pathname === '/';
    if (item.to === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(item.to);
  };

  const showLabel = !collapsed;

  return (
    <div
      className={`flex flex-col h-full bg-dark-elevation border-r border-copper/15
        transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-60'}`}
    >
      {/* Logo row */}
      <div className="flex items-center justify-between p-4 border-b border-copper/15 h-16">
        {showLabel && (
          <Link to="/" className="text-lg font-bold">
            <span className="bg-gradient-to-br from-copper to-copper-light bg-clip-text text-transparent">
              Smart
            </span>
            <span className="text-ivory-light">Event</span>
          </Link>
        )}
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="text-gray-400 hover:text-copper p-1.5 rounded-lg hover:bg-copper/10 transition-colors"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* User info */}
      <div className={`p-4 border-b border-copper/15 ${!showLabel ? 'flex justify-center' : ''}`}>
        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.full_name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-copper shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ring-2 ring-copper bg-gradient-to-br from-copper to-copper-light">
              {(user?.full_name ?? 'U').charAt(0).toUpperCase()}
            </div>
          )}
          {showLabel && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ivory-light truncate">{user?.full_name ?? 'User'}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[user?.role ?? 'client']}`}>
                {ROLE_LABEL[user?.role ?? 'client']}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={`${item.to}-${item.label}`}
              to={item.to}
              title={!showLabel ? item.label : undefined}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all
                ${!showLabel ? 'justify-center' : ''}
                ${active
                  ? 'text-white font-medium shadow-md bg-gradient-to-br from-copper to-copper-light'
                  : 'text-gray-400 hover:text-ivory-light hover:bg-copper/8'
                }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {showLabel && <span>{item.label}</span>}
              {item.to === '/dashboard/notifications' && unreadCount > 0 && (
                <span className={`${showLabel ? 'ml-auto' : 'absolute top-1 right-1'} min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center
                  ${active ? 'bg-white text-copper' : 'bg-copper text-white'}`}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-copper/15">
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

// ─── Mobile "More" drawer ─────────────────────────────────────────────────────
// Shows the overflow nav items that don't fit in the bottom bar
interface MoreDrawerProps {
  items: NavItem[];
  unreadCount: number;
  onClose: () => void;
}

function MoreDrawer({ items, unreadCount, onClose }: MoreDrawerProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/');
  };

  const isActive = (item: NavItem) => {
    if (item.to === '/') return location.pathname === '/';
    if (item.to === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(item.to);
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sheet — slides up from bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-dark-elevation rounded-t-2xl border-t border-copper/15 pb-safe">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-600" />
        </div>

        {/* User info strip */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-copper/15">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.full_name} className="w-9 h-9 rounded-full object-cover ring-2 ring-copper shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ring-2 ring-copper bg-gradient-to-br from-copper to-copper-light">
              {(user?.full_name ?? 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ivory-light truncate">{user?.full_name ?? 'User'}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[user?.role ?? 'client']}`}>
              {ROLE_LABEL[user?.role ?? 'client']}
            </span>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-ivory-light p-1.5 rounded-lg hover:bg-copper/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Overflow nav items in a 3-column grid */}
        <nav className="grid grid-cols-3 gap-1 p-3">
          {items.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={`${item.to}-${item.label}`}
                to={item.to}
                onClick={onClose}
                className={`relative flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-xs font-medium transition-all
                  ${active
                    ? 'text-white bg-gradient-to-br from-copper to-copper-light shadow-md'
                    : 'text-gray-400 hover:text-ivory-light hover:bg-copper/10'
                  }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="text-center leading-tight">{item.label}</span>
                {item.to === '/dashboard/notifications' && unreadCount > 0 && (
                  <span className="absolute top-2 right-2 min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center bg-copper text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-4 border-t border-copper/15 pt-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/10 w-full transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Bottom Navigation Bar ────────────────────────────────────────────
// Shows up to 4 primary nav items + a "More" button
interface BottomNavProps {
  navItems: NavItem[];
  unreadCount: number;
  onMoreClick: () => void;
}

function BottomNav({ navItems, unreadCount, onMoreClick }: BottomNavProps) {
  const location = useLocation();

  const isActive = (item: NavItem) => {
    if (item.to === '/') return location.pathname === '/';
    if (item.to === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(item.to);
  };

  // Show first 4 items in the bar; the rest go into "More"
  const PRIMARY_COUNT = 4;
  const primaryItems = navItems.slice(0, PRIMARY_COUNT);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-elevation border-t border-copper/15 flex items-stretch pb-safe">
      {primaryItems.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={`${item.to}-${item.label}`}
            to={item.to}
            className={`relative flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[11px] font-medium transition-all
              ${active ? 'text-copper' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {/* Active indicator dot above icon */}
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-copper" />
            )}
            <item.icon className="w-5 h-5 shrink-0" />
            <span>{item.label}</span>
            {item.to === '/dashboard/notifications' && unreadCount > 0 && (
              <span className="absolute top-1.5 right-[calc(50%-14px)] min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center bg-copper text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        );
      })}

      {/* More button — only shown when there are overflow items */}
      {navItems.length > PRIMARY_COUNT && (
        <button
          onClick={onMoreClick}
          className="relative flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[11px] font-medium text-gray-500 hover:text-gray-300 transition-all"
        >
          <MoreHorizontal className="w-5 h-5 shrink-0" />
          <span>More</span>
        </button>
      )}
    </nav>
  );
}

// ─── Main layout ──────────────────────────────────────────────────────────────
export default function DashboardLayout() {
  const { user } = useAuth();
  const [collapsed,    setCollapsed]    = useState(false);
  const [moreOpen,     setMoreOpen]     = useState(false);
  const [unreadCount,  setUnreadCount]  = useState(0);
  const location = useLocation();

  const role     = (user?.role ?? 'client') as 'admin' | 'event_manager' | 'client';
  const navItems = ALL_NAV.filter((n) => n.roles.includes(role));

  // Close "More" drawer on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  // Fetch unread notification count
  useEffect(() => {
    let isMounted = true;
    notificationsApi.list({ unread_only: true, per_page: 1 })
      .then((res) => {
        if (isMounted) setUnreadCount(res.data?.unread_count ?? 0);
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [location.pathname]);

  const PRIMARY_COUNT   = 4;
  const overflowItems   = navItems.slice(PRIMARY_COUNT);

  return (
    <div className="min-h-screen bg-dark-base flex">

      {/* ── Desktop sidebar (unchanged) ── */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40">
        <Sidebar
          collapsed={collapsed}
          navItems={navItems}
          unreadCount={unreadCount}
          onCollapse={() => setCollapsed((v) => !v)}
        />
      </aside>

      {/* ── Mobile "More" drawer ── */}
      {moreOpen && (
        <MoreDrawer
          items={overflowItems}
          unreadCount={unreadCount}
          onClose={() => setMoreOpen(false)}
        />
      )}

      {/* ── Main content area ── */}
      <main
        className={`flex-1 transition-all duration-300 min-h-screen
          ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-60'}
          pb-[64px] lg:pb-0`}  // reserve space for bottom nav on mobile
      >
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-dark-elevation/80 backdrop-blur-md border-b border-copper/15 px-4 sm:px-6 py-3 flex items-center justify-between h-14">
          {/* Logo shown in top bar on mobile (sidebar is gone) */}
          <Link to="/" className="lg:hidden text-base font-bold">
            <span className="bg-gradient-to-br from-copper to-copper-light bg-clip-text text-transparent">Smart</span>
            <span className="text-ivory-light">Event</span>
          </Link>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-2">
            <Link
              to="/dashboard/notifications"
              className="relative p-2 text-gray-400 hover:text-copper rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-bold bg-copper text-white flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            <Link to="/dashboard/profile" className="flex items-center gap-2 pl-1">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.full_name} className="w-7 h-7 rounded-full object-cover border border-copper" />
              ) : (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border border-copper bg-gradient-to-br from-copper to-copper-light">
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

      {/* ── Mobile bottom navigation bar ── */}
      <BottomNav
        navItems={navItems}
        unreadCount={unreadCount}
        onMoreClick={() => setMoreOpen(true)}
      />
    </div>
  );
}